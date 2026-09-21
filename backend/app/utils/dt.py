"""
Small helper to make datetime comparisons safe regardless of whether the
underlying DB driver returns timezone-aware or naive datetimes.

Postgres (via psycopg2) returns tz-aware datetimes for TIMESTAMPTZ columns,
but SQLite (used in local tests) always returns naive ones. Rather than
branch on the DB backend everywhere we compare "now" against a stored
review/session timestamp, we normalize here.
"""
from datetime import datetime, timezone


def as_aware_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)
