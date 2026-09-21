import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base, TimestampMixin


class ReviewSchedule(Base, TimestampMixin):
    __tablename__ = "review_schedule"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    knowledge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("knowledge.id"), unique=True, nullable=False
    )

    next_review_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    interval_days: Mapped[int] = mapped_column(Integer, default=1)
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    consecutive_forgot_count: Mapped[int] = mapped_column(Integer, default=0)  # leech detection
    status: Mapped[str] = mapped_column(String(20), default="new")  # new, learning, review, leech

    knowledge: Mapped["Knowledge"] = relationship(back_populates="review_schedule")
