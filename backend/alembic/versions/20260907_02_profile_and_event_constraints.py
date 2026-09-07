"""Complete the Phase 1 profile and event-log constraints.

Revision ID: 20260907_02
Revises: 20260907_01
"""
from alembic import op
import sqlalchemy as sa


revision = "20260907_02"
down_revision = "20260907_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "learners",
        sa.Column("display_name", sa.String(length=120), nullable=False, server_default="Learner"),
    )
    op.create_index(
        "ix_mistake_events_learner_skill",
        "mistake_events",
        ["learner_id", "skill"],
    )
    with op.batch_alter_table("skill_graph_edges") as batch_op:
        batch_op.create_unique_constraint(
            "uq_skill_graph_edge",
            ["learner_id", "source_node_id", "target_node_id", "relation"],
        )


def downgrade() -> None:
    with op.batch_alter_table("skill_graph_edges") as batch_op:
        batch_op.drop_constraint("uq_skill_graph_edge", type_="unique")
    op.drop_index("ix_mistake_events_learner_skill", table_name="mistake_events")
    op.drop_column("learners", "display_name")
