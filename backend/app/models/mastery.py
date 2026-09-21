import uuid
from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base, TimestampMixin


class Mastery(Base, TimestampMixin):
    __tablename__ = "mastery"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    knowledge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("knowledge.id"), unique=True, nullable=False
    )
    level: Mapped[int] = mapped_column(Integer, default=0)  # 0-5, see mastery_engine for meanings

    knowledge: Mapped["Knowledge"] = relationship(back_populates="mastery")
