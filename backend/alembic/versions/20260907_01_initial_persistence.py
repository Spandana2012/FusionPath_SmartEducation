"""Initial learner persistence schema.

Revision ID: 20260907_01
Revises: None
"""
from alembic import op
import sqlalchemy as sa

revision = "20260907_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("learners", sa.Column("id", sa.String(36), primary_key=True), sa.Column("goal", sa.String(240), nullable=False), sa.Column("experience_level", sa.String(32), nullable=False), sa.Column("skills", sa.JSON(), nullable=False), sa.Column("completed_courses", sa.JSON(), nullable=False), sa.Column("weekly_hours", sa.Integer(), nullable=False), sa.Column("learning_preference", sa.String(32), nullable=False), sa.Column("timeline_months", sa.Integer(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_table("roadmap_states", sa.Column("id", sa.String(36), primary_key=True), sa.Column("learner_id", sa.String(36), sa.ForeignKey("learners.id", ondelete="CASCADE"), nullable=False), sa.Column("version", sa.Integer(), nullable=False), sa.Column("is_current", sa.Boolean(), nullable=False), sa.Column("state", sa.JSON(), nullable=False), sa.Column("change_reason", sa.String(500), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")), sa.UniqueConstraint("learner_id", "version", name="uq_roadmap_learner_version"))
    op.create_index("ix_roadmap_states_learner_id", "roadmap_states", ["learner_id"])
    op.create_table("mistake_events", sa.Column("id", sa.String(36), primary_key=True), sa.Column("learner_id", sa.String(36), sa.ForeignKey("learners.id", ondelete="CASCADE"), nullable=False), sa.Column("skill", sa.String(120), nullable=False), sa.Column("concept", sa.String(240), nullable=False), sa.Column("question_id", sa.String(120), nullable=False), sa.Column("event_type", sa.String(32), nullable=False), sa.Column("metadata", sa.JSON(), nullable=False), sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_index("ix_mistake_events_learner_id", "mistake_events", ["learner_id"])
    op.create_table("practice_attempts", sa.Column("id", sa.String(36), primary_key=True), sa.Column("learner_id", sa.String(36), sa.ForeignKey("learners.id", ondelete="CASCADE"), nullable=False), sa.Column("assessment_id", sa.String(120)), sa.Column("skill", sa.String(120), nullable=False), sa.Column("question_id", sa.String(120), nullable=False), sa.Column("difficulty", sa.String(24), nullable=False), sa.Column("selected_answer", sa.Text(), nullable=False), sa.Column("correct", sa.Boolean(), nullable=False), sa.Column("attempt_number", sa.Integer(), nullable=False), sa.Column("elapsed_seconds", sa.Integer()), sa.Column("error_type", sa.String(100)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_index("ix_practice_attempts_learner_id", "practice_attempts", ["learner_id"])
    op.create_table("skill_graph_nodes", sa.Column("id", sa.String(120), primary_key=True), sa.Column("learner_id", sa.String(36), sa.ForeignKey("learners.id", ondelete="CASCADE"), primary_key=True), sa.Column("label", sa.String(120), nullable=False), sa.Column("mastery", sa.Integer(), nullable=False), sa.Column("status", sa.String(24), nullable=False), sa.Column("metadata", sa.JSON(), nullable=False))
    op.create_table("skill_graph_edges", sa.Column("id", sa.String(36), primary_key=True), sa.Column("learner_id", sa.String(36), sa.ForeignKey("learners.id", ondelete="CASCADE"), nullable=False), sa.Column("source_node_id", sa.String(120), nullable=False), sa.Column("target_node_id", sa.String(120), nullable=False), sa.Column("relation", sa.String(40), nullable=False))
    op.create_index("ix_skill_graph_edges_learner_id", "skill_graph_edges", ["learner_id"])


def downgrade() -> None:
    op.drop_table("skill_graph_edges"); op.drop_table("skill_graph_nodes"); op.drop_table("practice_attempts"); op.drop_table("mistake_events"); op.drop_table("roadmap_states"); op.drop_table("learners")
