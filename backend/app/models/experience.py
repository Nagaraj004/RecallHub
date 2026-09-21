import uuid
from datetime import date
from sqlalchemy import Text, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base, TimestampMixin


class Experience(Base, TimestampMixin):
    __tablename__ = "experiences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    experience_date: Mapped[date] = mapped_column(Date, nullable=False)

    what_happened: Mapped[str] = mapped_column(Text, nullable=True)
    what_learned: Mapped[str] = mapped_column(Text, nullable=True)
    what_mistake: Mapped[str] = mapped_column(Text, nullable=True)
    what_different: Mapped[str] = mapped_column(Text, nullable=True)
    what_remember: Mapped[str] = mapped_column(Text, nullable=True)
