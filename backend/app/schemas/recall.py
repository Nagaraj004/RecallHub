import uuid
from datetime import datetime
from pydantic import BaseModel


class RecallQuestionCreate(BaseModel):
    knowledge_id: uuid.UUID
    question_text: str
    question_type: str = "short_answer"


class RecallQuestionOut(BaseModel):
    id: uuid.UUID
    knowledge_id: uuid.UUID
    question_text: str
    question_type: str

    class Config:
        from_attributes = True


class RecallSubmit(BaseModel):
    question_id: uuid.UUID
    user_answer: str | None = None
    confidence_before_reveal: int | None = None  # 1-5, optional calibration rating
    result: str  # forgot | difficult | partial | good | easy


class RecallSessionOut(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    user_answer: str | None
    confidence_before_reveal: int | None
    result: str
    answered_at: datetime

    class Config:
        from_attributes = True


class DueQuestionOut(BaseModel):
    """A knowledge item + its next due question, for the review queue."""
    knowledge_id: uuid.UUID
    knowledge_title: str
    question_id: uuid.UUID
    question_text: str
    next_review_date: datetime
    status: str
