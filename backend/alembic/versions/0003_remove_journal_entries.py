"""remove journal entries

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("journal_entries")


def downgrade() -> None:
    op.create_table(
        "journal_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("entry_date", sa.Date, nullable=False),
        sa.Column("what_learned", sa.Text),
        sa.Column("what_interesting", sa.Text),
        sa.Column("what_difficult", sa.Text),
        sa.Column("what_remember", sa.Text),
        sa.Column("what_practice", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
