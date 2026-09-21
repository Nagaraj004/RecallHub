# RecallHub — Architecture Notes

## Request flow

```
Browser (React) --HTTP/JWT--> FastAPI --SQLAlchemy--> PostgreSQL
```

- The frontend never talks to Postgres directly; everything goes through
  `/api/v1/*` routes.
- Auth is stateless JWT (access + refresh). The access token is sent as a
  Bearer header on every request via an axios interceptor
  (`frontend/src/api/client.ts`).
- `app/deps.py::get_current_user` decodes the token and loads the user on
  every protected route.

## The scheduling engine

`app/services/spaced_repetition.py` is the one place that decides when a
knowledge item comes back for review. It's intentionally small and pure
(no DB or HTTP concerns) so it's easy to test and easy to swap for a more
sophisticated algorithm (full SM-2, SM-17, FSRS, etc.) later without
touching any route code.

Key behaviors:
- Base intervals follow the roadmap exactly (Forgot → 1 day, Easy → 21 days, etc.)
- An ease factor (SM-2-style, starts at 2.5) grows or shrinks intervals
  over repeated reviews so a topic you keep nailing gets reviewed less
  and less often, rather than resetting to a flat number every time.
- Three consecutive "Forgot" results flips a schedule's status to `leech`,
  which routes it to a separate bucket in the review queue instead of
  letting it clog the normal Overdue/Due Today lists.

## Mastery vs. recall accuracy — why both exist

Recall accuracy (in analytics) tells you how often you remember something
when tested. Mastery level (0–5) is a slower-moving, more holistic signal:
it only reaches level 4+ once you've also **applied** the knowledge via a
practice attempt you self-rated as correct. This mirrors the roadmap's own
distinction: "Recall tells you whether you remember something. Practice
tells you whether you can use it."

## Known simplifications in this MVP

- `dashboard.py`'s `practice_completed` count isn't yet scoped strictly to
  the current user's own practice items (fine for a single-user deployment,
  worth tightening with an explicit join before multi-user use).
- No rate limiting, no email verification, no password reset flow yet.
- Alembic's initial migration (`0001_initial_schema.py`) was written by
  hand to mirror the SQLAlchemy models 1:1, since autogenerate needs a
  live DB connection. If you add new models, generate the next migration
  the normal way: `alembic revision --autogenerate -m "add whatever"`.
