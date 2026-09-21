"""add canvas_data to knowledge_notes

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("knowledge_notes", sa.Column("canvas_data", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("knowledge_notes", "canvas_data")
