import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base, TimestampMixin


class PracticeItem(Base, TimestampMixin):
    __tablename__ = "practice_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    knowledge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("knowledge.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(30), default="short_answer")
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer: Mapped[str] = mapped_column(Text, nullable=True)

    attempts: Mapped[list["PracticeAttempt"]] = relationship(
        back_populates="practice_item", cascade="all, delete-orphan"
    )


class PracticeAttempt(Base):
    __tablename__ = "practice_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("practice_items.id"), nullable=False
    )
    user_answer: Mapped[str] = mapped_column(Text, nullable=True)
    self_rated_correct: Mapped[bool] = mapped_column(Boolean, nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    practice_item: Mapped["PracticeItem"] = relationship(back_populates="attempts")
