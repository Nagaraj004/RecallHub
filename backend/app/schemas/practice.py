import uuid
from pydantic import BaseModel


class PracticeItemCreate(BaseModel):
    knowledge_id: uuid.UUID
    type: str = "short_answer"
    prompt: str
    expected_answer: str | None = None


class PracticeItemOut(BaseModel):
    id: uuid.UUID
    knowledge_id: uuid.UUID
    type: str
    prompt: str
    expected_answer: str | None

    class Config:
        from_attributes = True


class PracticeAttemptSubmit(BaseModel):
    practice_item_id: uuid.UUID
    user_answer: str | None = None
    self_rated_correct: bool | None = None
