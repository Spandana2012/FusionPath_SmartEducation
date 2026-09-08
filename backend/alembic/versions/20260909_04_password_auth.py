"""Add password account fields while preserving existing users.

Revision ID: 20260909_04
Revises: 20260908_03
"""
from alembic import op
import sqlalchemy as sa


revision = "20260909_04"
down_revision = "20260908_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("password_hash", sa.String(length=300), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "password_hash")
    op.drop_column("users", "phone")
    op.drop_column("users", "name")
