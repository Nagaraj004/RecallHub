"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-09-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(100)),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("is_custom", sa.Boolean, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "topics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
    )

    op.create_table(
        "knowledge",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("topics.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("type", sa.String(50), server_default="concept"),
        sa.Column("description", sa.Text),
        sa.Column("my_understanding", sa.Text),
        sa.Column("example", sa.Text),
        sa.Column("source", sa.String(500)),
        sa.Column("difficulty", sa.Integer, server_default="1"),
        sa.Column("is_favorite", sa.Boolean, server_default=sa.false()),
        sa.Column("is_archived", sa.Boolean, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "knowledge_tags",
        sa.Column("knowledge_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge.id"), primary_key=True),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tags.id"), primary_key=True),
    )

    op.create_table(
        "recall_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("knowledge_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge.id"), nullable=False),
        sa.Column("question_text", sa.Text, nullable=False),
        sa.Column("question_type", sa.String(50), server_default="short_answer"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "recall_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recall_questions.id"), nullable=False),
        sa.Column("user_answer", sa.Text),
        sa.Column("confidence_before_reveal", sa.Integer),
        sa.Column("result", sa.String(20), nullable=False),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "review_schedule",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("knowledge_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge.id"), nullable=False, unique=True),
        sa.Column("next_review_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("interval_days", sa.Integer, server_default="1"),
        sa.Column("ease_factor", sa.Float, server_default="2.5"),
        sa.Column("consecutive_forgot_count", sa.Integer, server_default="0"),
        sa.Column("status", sa.String(20), server_default="new"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "practice_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("knowledge_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge.id"), nullable=False),
        sa.Column("type", sa.String(30), server_default="short_answer"),
        sa.Column("prompt", sa.Text, nullable=False),
        sa.Column("expected_answer", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "practice_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("practice_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("practice_items.id"), nullable=False),
        sa.Column("user_answer", sa.Text),
        sa.Column("self_rated_correct", sa.Boolean),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "mastery",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("knowledge_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge.id"), nullable=False, unique=True),
        sa.Column("level", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

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

    op.create_table(
        "ideas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("category", sa.String(50), server_default="general"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "experiences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("experience_date", sa.Date, nullable=False),
        sa.Column("what_happened", sa.Text),
        sa.Column("what_learned", sa.Text),
        sa.Column("what_mistake", sa.Text),
        sa.Column("what_different", sa.Text),
        sa.Column("what_remember", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "knowledge_relationships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("from_knowledge_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge.id"), nullable=False),
        sa.Column("to_knowledge_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge.id"), nullable=False),
        sa.Column("relationship_type", sa.String(30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("knowledge_relationships")
    op.drop_table("experiences")
    op.drop_table("ideas")
    op.drop_table("journal_entries")
    op.drop_table("mastery")
    op.drop_table("practice_attempts")
    op.drop_table("practice_items")
    op.drop_table("review_schedule")
    op.drop_table("recall_sessions")
    op.drop_table("recall_questions")
    op.drop_table("knowledge_tags")
    op.drop_table("knowledge")
    op.drop_table("tags")
    op.drop_table("topics")
    op.drop_table("categories")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
