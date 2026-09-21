import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base, TimestampMixin


class Topic(Base, TimestampMixin):
    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    category: Mapped["Category"] = relationship(back_populates="topics")
    knowledge_items: Mapped[list["Knowledge"]] = relationship(back_populates="topic", cascade="all, delete-orphan")
