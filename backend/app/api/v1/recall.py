import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.deps import get_current_user
from app.models.knowledge import Knowledge
from app.models.mastery import Mastery
from app.models.recall_question import RecallQuestion
from app.models.recall_session import RecallSession
from app.models.review_schedule import ReviewSchedule
from app.models.user import User
from app.schemas.recall import RecallQuestionCreate, RecallQuestionOut, RecallSessionOut, RecallSubmit
from app.services.mastery_engine import update_mastery_from_recall
from app.services.spaced_repetition import schedule_next_review

router = APIRouter(prefix="/recall", tags=["recall"])


@router.post("/questions", response_model=RecallQuestionOut, status_code=status.HTTP_201_CREATED)
def create_question(payload: RecallQuestionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    knowledge = db.query(Knowledge).filter(Knowledge.id == payload.knowledge_id, Knowledge.user_id == user.id).first()
    if not knowledge:
        raise NotFoundError("Knowledge item not found")

    question = RecallQuestion(
        knowledge_id=payload.knowledge_id,
        question_text=payload.question_text,
        question_type=payload.question_type,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.get("/questions/{knowledge_id}", response_model=list[RecallQuestionOut])
def list_questions_for_knowledge(knowledge_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    knowledge = db.query(Knowledge).filter(Knowledge.id == knowledge_id, Knowledge.user_id == user.id).first()
    if not knowledge:
        raise NotFoundError("Knowledge item not found")
    return db.query(RecallQuestion).filter(RecallQuestion.knowledge_id == knowledge_id).all()


@router.post("/submit", response_model=RecallSessionOut, status_code=status.HTTP_201_CREATED)
def submit_recall(payload: RecallSubmit, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Core recall loop:
    1. Record the session (what the user answered + how they scored themselves)
    2. Advance the spaced-repetition schedule for the parent knowledge item
    3. Nudge the mastery level based on the result
    """
    question = (
        db.query(RecallQuestion)
        .join(Knowledge)
        .filter(RecallQuestion.id == payload.question_id, Knowledge.user_id == user.id)
        .first()
    )
    if not question:
        raise NotFoundError("Recall question not found")

    session = RecallSession(
        question_id=payload.question_id,
        user_answer=payload.user_answer,
        confidence_before_reveal=payload.confidence_before_reveal,
        result=payload.result,
    )
    db.add(session)

    schedule = db.query(ReviewSchedule).filter(ReviewSchedule.knowledge_id == question.knowledge_id).first()
    if schedule:
        schedule_next_review(schedule, payload.result)

    mastery = db.query(Mastery).filter(Mastery.knowledge_id == question.knowledge_id).first()
    if mastery:
        mastery.level = update_mastery_from_recall(mastery.level, payload.result)

    db.commit()
    db.refresh(session)
    return session
