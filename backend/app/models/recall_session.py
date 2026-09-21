import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base

RECALL_RESULTS = ("forgot", "difficult", "partial", "good", "easy")


class RecallSession(Base):
    __tablename__ = "recall_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("recall_questions.id"), nullable=False
    )
    user_answer: Mapped[str] = mapped_column(Text, nullable=True)
    confidence_before_reveal: Mapped[int] = mapped_column(Integer, nullable=True)  # 1-5, optional
    result: Mapped[str] = mapped_column(String(20), nullable=False)  # one of RECALL_RESULTS
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    question: Mapped["RecallQuestion"] = relationship(back_populates="sessions")
