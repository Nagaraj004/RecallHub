"""knowledge notes

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "knowledge_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "knowledge_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("label", sa.String(50), nullable=False, server_default="note"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_knowledge_notes_knowledge_id", "knowledge_notes", ["knowledge_id"])


def downgrade() -> None:
    op.drop_index("ix_knowledge_notes_knowledge_id", table_name="knowledge_notes")
    op.drop_table("knowledge_notes")
