import uuid
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base, TimestampMixin


class RecallQuestion(Base, TimestampMixin):
    __tablename__ = "recall_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    knowledge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("knowledge.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(50), default="short_answer")

    knowledge: Mapped["Knowledge"] = relationship(back_populates="questions")
    sessions: Mapped[list["RecallSession"]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )
