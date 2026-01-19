"""create offers table

Revision ID: b181c921e012
Revises: 55b74fb0edea
Create Date: 2026-01-24 12:47:22.167500
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b181c921e012"
down_revision: Union[str, None] = "55b74fb0edea"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "offers",
        sa.Column("id", sa.String(), primary_key=True, index=True),
        sa.Column("have_name", sa.String()),
        sa.Column("have_quantity", sa.String()),
        sa.Column("have_category", sa.String()),
        sa.Column("have_image", sa.String(), nullable=True),
        sa.Column("have_owner", sa.String()),
        sa.Column("want_name", sa.String()),
        sa.Column("want_quantity", sa.String()),
        sa.Column("want_category", sa.String()),
        sa.Column("want_image", sa.String(), nullable=True),
        sa.Column("want_owner", sa.String()),
        sa.Column("location", sa.String()),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String()),
        sa.Column("timestamp", sa.String()),
        sa.Column("matched_with", sa.String(), nullable=True),
        sa.Column("completion_code", sa.String(), nullable=True),
        sa.Column("confirmed_by", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("offers")
