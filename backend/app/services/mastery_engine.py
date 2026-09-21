"""
Mastery level engine.

Levels (per roadmap):
    0 - Don't know
    1 - Familiar
    2 - Basic understanding
    3 - Can explain
    4 - Can apply
    5 - Can teach

Simple heuristic MVP version:
- Recall results nudge levels 0-3 (memory-based).
- Practice attempts push levels 3-5 (application-based) since
  practice tests whether you can *use* the knowledge, not just recall it.
"""

MASTERY_LEVELS = {
    0: "Don't know",
    1: "Familiar",
    2: "Basic understanding",
    3: "Can explain",
    4: "Can apply",
    5: "Can teach",
}


def update_mastery_from_recall(current_level: int, result: str) -> int:
    if result == "forgot":
        return max(0, current_level - 1)
    if result == "difficult":
        return max(current_level, 1)
    if result == "partial":
        return max(current_level, 2)
    if result in ("good", "easy"):
        return min(3, max(current_level, 3)) if current_level < 3 else current_level
    return current_level


def update_mastery_from_practice(current_level: int, self_rated_correct: bool | None) -> int:
    if self_rated_correct is True:
        return min(5, max(current_level, 4))
    if self_rated_correct is False:
        return current_level  # don't punish practice attempts, only reward
    return current_level
