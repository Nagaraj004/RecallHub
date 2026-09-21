"""
Spaced repetition scheduling engine.

Implements the interval logic described in the RecallHub roadmap:

    Forgot     -> review tomorrow, interval resets
    Difficult  -> review in 1-2 days
    Partial    -> review in 3 days
    Good       -> review in 7 days
    Easy       -> review in 14-30 days

Also folds in a simple SM-2-style ease factor adjustment so intervals
grow smoothly over repeated successful reviews instead of jumping
straight back to a fixed number every time, and flags "leeches"
(items forgotten 3+ times in a row) per the new-feature additions.
"""
from datetime import datetime, timedelta, timezone

from app.models.review_schedule import ReviewSchedule

RESULT_BASE_INTERVAL = {
    "forgot": 1,
    "difficult": 2,
    "partial": 3,
    "good": 7,
    "easy": 21,
}

RESULT_EASE_DELTA = {
    "forgot": -0.3,
    "difficult": -0.15,
    "partial": 0.0,
    "good": 0.1,
    "easy": 0.2,
}

MIN_EASE_FACTOR = 1.3
LEECH_THRESHOLD = 3


def schedule_next_review(schedule: ReviewSchedule, result: str) -> ReviewSchedule:
    """Mutates and returns the given ReviewSchedule based on a recall result."""
    if result not in RESULT_BASE_INTERVAL:
        raise ValueError(f"Unknown recall result: {result}")

    # Update ease factor
    schedule.ease_factor = max(
        MIN_EASE_FACTOR, schedule.ease_factor + RESULT_EASE_DELTA[result]
    )

    if result == "forgot":
        schedule.consecutive_forgot_count += 1
        schedule.interval_days = RESULT_BASE_INTERVAL["forgot"]
    else:
        schedule.consecutive_forgot_count = 0
        if schedule.status == "new":
            schedule.interval_days = RESULT_BASE_INTERVAL[result]
        else:
            # Grow the previous interval by the ease factor, but never
            # below the roadmap's suggested base interval for this result.
            grown = round(schedule.interval_days * schedule.ease_factor)
            schedule.interval_days = max(grown, RESULT_BASE_INTERVAL[result])

    schedule.next_review_date = datetime.now(timezone.utc) + timedelta(days=schedule.interval_days)

    if schedule.consecutive_forgot_count >= LEECH_THRESHOLD:
        schedule.status = "leech"
    elif result in ("good", "easy") and schedule.interval_days >= 21:
        schedule.status = "review"
    else:
        schedule.status = "learning"

    return schedule


def initial_schedule_values() -> dict:
    """Defaults for a brand-new ReviewSchedule row."""
    return {
        "next_review_date": datetime.now(timezone.utc) + timedelta(days=1),
        "interval_days": 1,
        "ease_factor": 2.5,
        "consecutive_forgot_count": 0,
        "status": "new",
    }
