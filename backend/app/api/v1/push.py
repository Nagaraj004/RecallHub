from datetime import datetime, timezone
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.deps import get_current_user
from app.models.knowledge import Knowledge
from app.models.push_subscription import PushSubscription
from app.models.review_schedule import ReviewSchedule
from app.models.user import User
from app.services.webpush import (
    generate_vapid_key_pair,
    send_web_push,
)
from app.utils.dt import as_aware_utc

logger = logging.getLogger("recallhub.push")
router = APIRouter(prefix="/push", tags=["push"])

# Cache generated keys in memory if not specified in config/env
_cached_vapid_keys: tuple[str, str] | None = None


def get_active_vapid_keys() -> tuple[str, str]:
    global _cached_vapid_keys
    if settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY:
        return settings.VAPID_PUBLIC_KEY, settings.VAPID_PRIVATE_KEY
    if _cached_vapid_keys is None:
        _cached_vapid_keys = generate_vapid_key_pair()
        logger.info("Generated in-memory VAPID keypair for push notifications")
    return _cached_vapid_keys


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushKeys
    user_agent: Optional[str] = None


class PushUnsubscribe(BaseModel):
    endpoint: Optional[str] = None


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """Returns the applicationServerKey (VAPID public key) for browser pushManager.subscribe()"""
    public_key, _ = get_active_vapid_keys()
    return {"public_key": public_key}


@router.get("/status")
def get_push_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Check if the current user has any active push subscriptions."""
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id).all()
    return {
        "subscribed": len(subs) > 0,
        "subscription_count": len(subs),
        "endpoints": [s.endpoint for s in subs],
    }


@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
def subscribe_push(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register or update a browser push subscription for the logged-in user."""
    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == current_user.id, PushSubscription.endpoint == payload.endpoint)
        .first()
    )

    if existing:
        existing.p256dh_key = payload.keys.p256dh
        existing.auth_key = payload.keys.auth
        if payload.user_agent:
            existing.user_agent = payload.user_agent
        db.commit()
        return {"status": "updated", "id": str(existing.id)}

    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh_key=payload.keys.p256dh,
        auth_key=payload.keys.auth,
        user_agent=payload.user_agent,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"status": "created", "id": str(sub.id)}


@router.delete("/subscribe")
def unsubscribe_push(
    payload: Optional[PushUnsubscribe] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unregister a push subscription."""
    query = db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id)
    if payload and payload.endpoint:
        query = query.filter(PushSubscription.endpoint == payload.endpoint)

    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    return {"status": "unsubscribed", "deleted_count": deleted_count}


@router.post("/test-notification")
def send_test_notification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sends an immediate test push notification to all devices registered for this user."""
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id).all()
    if not subs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No push subscriptions found for this account. Please enable Reminders first.",
        )

    public_key, private_key = get_active_vapid_keys()

    notification_payload = {
        "title": "🧠 RecallHub Reminders Active",
        "body": "Spaced recall push notifications are working perfectly on this device!",
        "url": "/reviews",
        "tag": "recallhub-test-notification",
        "icon": "/icons/icon-192.png",
        "badge": "/icons/icon-192.png",
    }

    results = []
    dead_subs = []

    for sub in subs:
        success, code, res = send_web_push(
            endpoint=sub.endpoint,
            p256dh=sub.p256dh_key,
            auth=sub.auth_key,
            payload=notification_payload,
            vapid_private_key=private_key,
            vapid_public_key=public_key,
            vapid_claim_email=settings.VAPID_CLAIM_EMAIL,
        )
        results.append({"endpoint": sub.endpoint[:35] + "...", "success": success, "status_code": code})
        # If subscription has expired or unsubscribed on push service side (404/410)
        if code in (404, 410):
            dead_subs.append(sub.id)

    if dead_subs:
        db.query(PushSubscription).filter(PushSubscription.id.in_(dead_subs)).delete(synchronize_session=False)
        db.commit()

    return {
        "message": f"Sent test notification to {len(subs)} device(s)",
        "results": results,
    }


@router.post("/send-due-reminders")
def send_due_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Checks for items due for review and sends real push notifications
    naming each due concept/topic with direct deep-links.
    """
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id).all()
    if not subs:
        return {
            "status": "skipped",
            "message": "User has no push subscriptions registered.",
            "due_items_count": 0,
        }

    now = datetime.now(timezone.utc)

    # Query due review schedules for the current user
    schedules = (
        db.query(ReviewSchedule)
        .join(Knowledge)
        .filter(
            Knowledge.user_id == current_user.id,
            Knowledge.is_archived == False,  # noqa: E712
        )
        .all()
    )

    due_items = []
    for sched in schedules:
        review_date = as_aware_utc(sched.next_review_date)
        if review_date <= now:
            due_items.append(sched.knowledge)

    if not due_items:
        return {
            "status": "ok",
            "message": "No items are currently due for review.",
            "due_items_count": 0,
        }

    public_key, private_key = get_active_vapid_keys()

    # If multiple items are due, we can send a targeted reminder for the primary due item
    # or separate notices. Let's send a focused notification for the top due item
    # mentioning any additional due count!
    primary_item = due_items[0]
    total_due = len(due_items)

    if total_due == 1:
        title = f"⏰ Review Due: {primary_item.title}"
        body = f"'{primary_item.title}' is due for spaced review today. Tap to practice!"
    else:
        title = f"⏰ {total_due} Items Due: {primary_item.title}"
        body = f"'{primary_item.title}' and {total_due - 1} other item(s) are ready for review. Tap to reinforce your memory!"

    notification_payload = {
        "title": title,
        "body": body,
        "url": f"/knowledge/{primary_item.id}",
        "tag": f"recall-due-{primary_item.id}",
        "icon": "/icons/icon-192.png",
        "badge": "/icons/icon-192.png",
        "data": {
            "url": f"/knowledge/{primary_item.id}",
            "knowledge_id": str(primary_item.id),
        },
    }

    sent_count = 0
    dead_subs = []
    for sub in subs:
        success, code, _ = send_web_push(
            endpoint=sub.endpoint,
            p256dh=sub.p256dh_key,
            auth=sub.auth_key,
            payload=notification_payload,
            vapid_private_key=private_key,
            vapid_public_key=public_key,
            vapid_claim_email=settings.VAPID_CLAIM_EMAIL,
        )
        if success:
            sent_count += 1
        elif code in (404, 410):
            dead_subs.append(sub.id)

    if dead_subs:
        db.query(PushSubscription).filter(PushSubscription.id.in_(dead_subs)).delete(synchronize_session=False)
        db.commit()

    return {
        "status": "sent",
        "due_items_count": total_due,
        "primary_item_title": primary_item.title,
        "primary_item_id": str(primary_item.id),
        "devices_notified": sent_count,
    }
