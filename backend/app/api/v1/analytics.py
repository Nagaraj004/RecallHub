from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.category import Category
from app.models.knowledge import Knowledge
from app.models.mastery import Mastery
from app.models.recall_question import RecallQuestion
from app.models.recall_session import RecallSession
from app.models.topic import Topic
from app.models.user import User
from app.services.mastery_engine import MASTERY_LEVELS

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
def get_analytics(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    total_knowledge = db.query(Knowledge).filter(Knowledge.user_id == user.id).count()

    sessions = (
        db.query(RecallSession)
        .join(RecallQuestion)
        .join(Knowledge)
        .filter(Knowledge.user_id == user.id)
        .all()
    )
    total_reviews = len(sessions)
    successful = [s for s in sessions if s.result in ("good", "easy")]
    failed = [s for s in sessions if s.result == "forgot"]
    recall_accuracy = round((len(successful) / total_reviews) * 100, 1) if total_reviews else 0.0

    mastery_rows = db.query(Mastery).join(Knowledge).filter(Knowledge.user_id == user.id).all()
    mastery_distribution = {MASTERY_LEVELS[level]: 0 for level in MASTERY_LEVELS}
    for m in mastery_rows:
        mastery_distribution[MASTERY_LEVELS.get(m.level, "Unknown")] += 1

    category_rows = (
        db.query(Category.name, Knowledge.id)
        .join(Topic, Topic.category_id == Category.id)
        .join(Knowledge, Knowledge.topic_id == Topic.id)
        .filter(Category.user_id == user.id)
        .all()
    )
    category_distribution = dict(Counter(name for name, _ in category_rows))

    # frequently forgotten: knowledge items with the most "forgot" sessions
    forgot_counts = Counter()
    knowledge_titles = {}
    for s in failed:
        knowledge = s.question.knowledge
        forgot_counts[knowledge.id] += 1
        knowledge_titles[knowledge.id] = knowledge.title

    frequently_forgotten = [
        {"knowledge_id": str(kid), "title": knowledge_titles[kid], "forgot_count": count}
        for kid, count in forgot_counts.most_common(10)
    ]

    return {
        "total_knowledge": total_knowledge,
        "total_reviews": total_reviews,
        "recall_accuracy": recall_accuracy,
        "failed_recalls": len(failed),
        "successful_recalls": len(successful),
        "mastery_distribution": mastery_distribution,
        "category_distribution": category_distribution,
        "frequently_forgotten": frequently_forgotten,
    }
