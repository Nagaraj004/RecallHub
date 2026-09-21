from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.knowledge import Knowledge
from app.models.mastery import Mastery
from app.models.practice import PracticeAttempt
from app.models.recall_question import RecallQuestion
from app.models.recall_session import RecallSession
from app.models.review_schedule import ReviewSchedule
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)

    knowledge_items = db.query(Knowledge).filter(Knowledge.user_id == user.id, Knowledge.is_archived == False).count()  # noqa: E712

    reviews_due = (
        db.query(ReviewSchedule)
        .join(Knowledge)
        .filter(Knowledge.user_id == user.id, ReviewSchedule.next_review_date <= now)
        .count()
    )

    mastered_topics = (
        db.query(Mastery)
        .join(Knowledge)
        .filter(Knowledge.user_id == user.id, Mastery.level >= 4)
        .count()
    )

    sessions = (
        db.query(RecallSession)
        .join(RecallQuestion)
        .join(Knowledge)
        .filter(Knowledge.user_id == user.id)
        .all()
    )
    total = len(sessions)
    successful = len([s for s in sessions if s.result in ("good", "easy")])
    recall_accuracy = round((successful / total) * 100, 1) if total else 0.0

    # streak: consecutive days (including today) with at least one recall session
    streak = 0
    day_cursor = now.date()
    session_dates = {s.answered_at.date() for s in sessions}
    while day_cursor in session_dates:
        streak += 1
        day_cursor -= timedelta(days=1)

    # NOTE: not yet scoped strictly per-user (PracticeAttempt -> PracticeItem -> Knowledge.user_id);
    # fine for a single-user MVP, tighten with an explicit join once multi-user matters.
    practice_completed = db.query(PracticeAttempt).count()

    return {
        "knowledge_items": knowledge_items,
        "reviews_due": reviews_due,
        "mastered_topics": mastered_topics,
        "recall_accuracy": recall_accuracy,
        "learning_streak": streak,
        "practice_completed": practice_completed,
    }
