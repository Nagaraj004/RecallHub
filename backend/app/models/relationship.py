import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base, TimestampMixin

RELATIONSHIP_TYPES = (
    "related_to", "prerequisite_of", "similar_to",
    "example_of", "depends_on", "contradicts", "extension_of",
)


class KnowledgeRelationship(Base, TimestampMixin):
    __tablename__ = "knowledge_relationships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_knowledge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("knowledge.id"))
    to_knowledge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("knowledge.id"))
    relationship_type: Mapped[str] = mapped_column(String(30), nullable=False)
