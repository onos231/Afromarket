"""Initial tables

Revision ID: 3e813ce14fb1
Revises: b181c921e012
Create Date: 2026-01-26 08:16:49.548115

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3e813ce14fb1"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "offers",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("have_name", sa.String()),
        sa.Column("have_quantity", sa.String()),
        sa.Column("have_category", sa.String()),
        sa.Column("have_image", sa.String()),
        sa.Column("have_owner", sa.String()),
        sa.Column("want_name", sa.String()),
        sa.Column("want_quantity", sa.String()),
        sa.Column("want_category", sa.String()),
        sa.Column("want_image", sa.String()),
        sa.Column("want_owner", sa.String()),
        sa.Column("location", sa.String()),
        sa.Column("message", sa.Text()),
        sa.Column("status", sa.String()),
        sa.Column("timestamp", sa.String()),
        sa.Column("matched_with", sa.String()),
        sa.Column("completion_code", sa.String()),
        sa.Column("confirmed_by", sa.String()),
        sa.Column("confirmation_code", sa.String()),
    )

def downgrade() -> None:
    op.drop_table("offers")
