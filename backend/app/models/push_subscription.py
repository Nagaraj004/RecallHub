import uuid
from sqlalchemy import String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base, TimestampMixin


class PushSubscription(Base, TimestampMixin):
    __tablename__ = "push_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    endpoint: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    p256dh_key: Mapped[str] = mapped_column(String(255), nullable=False)
    auth_key: Mapped[str] = mapped_column(String(255), nullable=False)
    user_agent: Mapped[str] = mapped_column(String(500), nullable=True)

    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "endpoint", name="uq_user_push_endpoint"),
    )
