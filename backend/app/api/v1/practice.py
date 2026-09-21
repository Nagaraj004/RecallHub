import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.deps import get_current_user
from app.models.knowledge import Knowledge
from app.models.mastery import Mastery
from app.models.practice import PracticeAttempt, PracticeItem
from app.models.user import User
from app.schemas.practice import PracticeAttemptSubmit, PracticeItemCreate, PracticeItemOut
from app.services.mastery_engine import update_mastery_from_practice

router = APIRouter(prefix="/practice", tags=["practice"])


@router.post("/items", response_model=PracticeItemOut, status_code=status.HTTP_201_CREATED)
def create_practice_item(payload: PracticeItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    knowledge = db.query(Knowledge).filter(Knowledge.id == payload.knowledge_id, Knowledge.user_id == user.id).first()
    if not knowledge:
        raise NotFoundError("Knowledge item not found")

    item = PracticeItem(
        knowledge_id=payload.knowledge_id,
        type=payload.type,
        prompt=payload.prompt,
        expected_answer=payload.expected_answer,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items/{knowledge_id}", response_model=list[PracticeItemOut])
def list_practice_items(knowledge_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    knowledge = db.query(Knowledge).filter(Knowledge.id == knowledge_id, Knowledge.user_id == user.id).first()
    if not knowledge:
        raise NotFoundError("Knowledge item not found")
    return db.query(PracticeItem).filter(PracticeItem.knowledge_id == knowledge_id).all()


@router.post("/attempts", status_code=status.HTTP_201_CREATED)
def submit_practice_attempt(payload: PracticeAttemptSubmit, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = (
        db.query(PracticeItem)
        .join(Knowledge)
        .filter(PracticeItem.id == payload.practice_item_id, Knowledge.user_id == user.id)
        .first()
    )
    if not item:
        raise NotFoundError("Practice item not found")

    attempt = PracticeAttempt(
        practice_item_id=payload.practice_item_id,
        user_answer=payload.user_answer,
        self_rated_correct=payload.self_rated_correct,
    )
    db.add(attempt)

    mastery = db.query(Mastery).filter(Mastery.knowledge_id == item.knowledge_id).first()
    if mastery:
        mastery.level = update_mastery_from_practice(mastery.level, payload.self_rated_correct)

    db.commit()
    db.refresh(attempt)
    return {
        "id": str(attempt.id),
        "practice_item_id": str(attempt.practice_item_id),
        "self_rated_correct": attempt.self_rated_correct,
        "new_mastery_level": mastery.level if mastery else None,
    }
