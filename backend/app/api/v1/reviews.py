from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.knowledge import Knowledge
from app.models.recall_question import RecallQuestion
from app.models.review_schedule import ReviewSchedule
from app.models.user import User
from app.utils.dt import as_aware_utc

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _serialize_due_item(schedule: ReviewSchedule, knowledge: Knowledge) -> dict:
    question = knowledge.questions[0] if knowledge.questions else None
    return {
        "knowledge_id": str(knowledge.id),
        "knowledge_title": knowledge.title,
        "question_id": str(question.id) if question else None,
        "question_text": question.question_text if question else None,
        "next_review_date": schedule.next_review_date.isoformat(),
        "status": schedule.status,
        "interval_days": schedule.interval_days,
    }


@router.get("/queue")
def get_review_queue(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Returns the due-reviews queue, bucketed like the roadmap's review page:
    overdue / due today / upcoming, plus a separate leech bucket
    (new feature: items forgotten 3+ times running).
    """
    now = datetime.now(timezone.utc)
    today_end = now.replace(hour=23, minute=59, second=59)

    schedules = (
        db.query(ReviewSchedule)
        .join(Knowledge)
        .filter(Knowledge.user_id == user.id, Knowledge.is_archived == False)  # noqa: E712
        .all()
    )

    overdue, due_today, upcoming, leeches = [], [], [], []

    for schedule in schedules:
        knowledge = schedule.knowledge
        item = _serialize_due_item(schedule, knowledge)

        review_date = as_aware_utc(schedule.next_review_date)

        if schedule.status == "leech":
            leeches.append(item)
        elif review_date < now:
            overdue.append(item)
        elif review_date <= today_end:
            due_today.append(item)
        else:
            upcoming.append(item)

    return {
        "overdue": overdue,
        "due_today": due_today,
        "upcoming": sorted(upcoming, key=lambda x: x["next_review_date"])[:20],
        "leeches": leeches,
    }


@router.get("/history/{knowledge_id}")
def get_review_history(knowledge_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models.recall_session import RecallSession

    sessions = (
        db.query(RecallSession)
        .join(RecallQuestion)
        .join(Knowledge)
        .filter(RecallQuestion.knowledge_id == knowledge_id, Knowledge.user_id == user.id)
        .order_by(RecallSession.answered_at.desc())
        .all()
    )
    return [
        {
            "id": str(s.id),
            "result": s.result,
            "confidence_before_reveal": s.confidence_before_reveal,
            "answered_at": s.answered_at.isoformat(),
        }
        for s in sessions
    ]
