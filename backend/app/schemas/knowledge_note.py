import uuid
from datetime import datetime
from pydantic import BaseModel


class KnowledgeNoteCreate(BaseModel):
    label: str = "note"
    content: str
    canvas_data: str | None = None


class KnowledgeNoteUpdate(BaseModel):
    label: str | None = None
    content: str | None = None
    canvas_data: str | None = None


class KnowledgeNoteOut(BaseModel):
    id: uuid.UUID
    knowledge_id: uuid.UUID
    label: str
    content: str
    canvas_data: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

