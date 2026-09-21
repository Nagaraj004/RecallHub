import uuid
from sqlalchemy import String, Text, Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base, TimestampMixin


class Knowledge(Base, TimestampMixin):
    __tablename__ = "knowledge"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("topics.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="concept")  # concept, fact, skill, quote, etc.
    description: Mapped[str] = mapped_column(Text, nullable=True)
    my_understanding: Mapped[str] = mapped_column(Text, nullable=True)
    example: Mapped[str] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(500), nullable=True)
    difficulty: Mapped[int] = mapped_column(Integer, default=1)  # 1-5

    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    topic: Mapped["Topic"] = relationship(back_populates="knowledge_items")
    questions: Mapped[list["RecallQuestion"]] = relationship(
        back_populates="knowledge", cascade="all, delete-orphan"
    )
    review_schedule: Mapped["ReviewSchedule"] = relationship(
        back_populates="knowledge", uselist=False, cascade="all, delete-orphan"
    )
    mastery: Mapped["Mastery"] = relationship(back_populates="knowledge", uselist=False, cascade="all, delete-orphan")
    notes: Mapped[list["KnowledgeNote"]] = relationship(
        back_populates="knowledge",
        cascade="all, delete-orphan",
        order_by="desc(KnowledgeNote.created_at)",
    )

