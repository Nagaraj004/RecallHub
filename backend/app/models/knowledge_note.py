import uuid
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base, TimestampMixin


class KnowledgeNote(Base, TimestampMixin):
    __tablename__ = "knowledge_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    knowledge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("knowledge.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(50), default="note")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    canvas_data: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    knowledge: Mapped["Knowledge"] = relationship(back_populates="notes")

