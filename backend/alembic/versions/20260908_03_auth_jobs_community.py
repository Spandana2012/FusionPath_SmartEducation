"""Add passwordless auth, curated jobs, and community tables.

Revision ID: 20260908_03
Revises: 20260907_02
"""
from alembic import op
import sqlalchemy as sa


revision = "20260908_03"
down_revision = "20260907_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    if "users" not in tables:
        op.create_table(
            "users",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("email", sa.String(320), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("verified_at", sa.DateTime(timezone=True)),
        )
    if not any(index["name"] == "ix_users_email" for index in inspector.get_indexes("users")):
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    learner_columns = {column["name"] for column in inspector.get_columns("learners")}
    if "user_id" not in learner_columns:
        with op.batch_alter_table("learners") as batch_op:
            batch_op.add_column(sa.Column("user_id", sa.String(36), nullable=True))
            batch_op.create_foreign_key("fk_learners_user_id", "users", ["user_id"], ["id"], ondelete="SET NULL")
    elif not any("user_id" in foreign_key.get("constrained_columns", []) for foreign_key in inspector.get_foreign_keys("learners")):
        with op.batch_alter_table("learners") as batch_op:
            batch_op.create_foreign_key("fk_learners_user_id", "users", ["user_id"], ["id"], ondelete="SET NULL")
    if not any(index["name"] == "ix_learners_user_id" for index in inspector.get_indexes("learners")):
        op.create_index("ix_learners_user_id", "learners", ["user_id"])

    op.create_table(
        "otp_codes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code_hash", sa.String(128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_otp_codes_user_id", "otp_codes", ["user_id"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)

    op.create_table(
        "job_listings",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("domain", sa.String(80), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("company", sa.String(160), nullable=False),
        sa.Column("location", sa.String(160), nullable=False),
        sa.Column("link", sa.String(500), nullable=False),
        sa.Column("posted_date", sa.DateTime(timezone=True)),
        sa.Column("seniority", sa.String(32), nullable=False, server_default="junior"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_job_listings_domain", "job_listings", ["domain"])

    op.create_table(
        "community_posts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("author_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("domain", sa.String(80), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("reported", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_community_posts_author_user_id", "community_posts", ["author_user_id"])
    op.create_index("ix_community_posts_domain", "community_posts", ["domain"])

    op.create_table(
        "community_replies",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("post_id", sa.String(36), sa.ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("reported", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_community_replies_post_id", "community_replies", ["post_id"])
    op.create_index("ix_community_replies_author_user_id", "community_replies", ["author_user_id"])


def downgrade() -> None:
    op.drop_table("community_replies")
    op.drop_table("community_posts")
    op.drop_table("job_listings")
    op.drop_table("refresh_tokens")
    op.drop_table("otp_codes")
    op.drop_index("ix_learners_user_id", table_name="learners")
    with op.batch_alter_table("learners") as batch_op:
        batch_op.drop_constraint("fk_learners_user_id", type_="foreignkey")
        batch_op.drop_column("user_id")
    op.drop_table("users")
