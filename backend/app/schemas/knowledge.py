import uuid
from datetime import datetime
from pydantic import BaseModel


class KnowledgeCreate(BaseModel):
    topic_id: uuid.UUID
    title: str
    type: str = "concept"
    description: str | None = None
    my_understanding: str | None = None
    example: str | None = None
    source: str | None = None
    difficulty: int = 1
    tags: list[str] = []


class KnowledgeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    my_understanding: str | None = None
    example: str | None = None
    source: str | None = None
    difficulty: int | None = None
    is_favorite: bool | None = None
    is_archived: bool | None = None


class KnowledgeOut(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    title: str
    type: str
    description: str | None
    my_understanding: str | None
    example: str | None
    source: str | None
    difficulty: int
    is_favorite: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
