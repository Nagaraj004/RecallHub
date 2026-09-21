import uuid
from datetime import datetime
from pydantic import BaseModel


class ReviewScheduleOut(BaseModel):
    id: uuid.UUID
    knowledge_id: uuid.UUID
    next_review_date: datetime
    interval_days: int
    ease_factor: float
    consecutive_forgot_count: int
    status: str

    class Config:
        from_attributes = True


class ReviewQueueOut(BaseModel):
    overdue: list[dict]
    due_today: list[dict]
    upcoming: list[dict]
    leeches: list[dict]
