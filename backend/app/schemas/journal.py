import uuid
from datetime import date
from pydantic import BaseModel



class IdeaCreate(BaseModel):
    title: str
    description: str | None = None
    category: str = "general"


class IdeaOut(IdeaCreate):
    id: uuid.UUID

    class Config:
        from_attributes = True


class ExperienceCreate(BaseModel):
    experience_date: date
    what_happened: str | None = None
    what_learned: str | None = None
    what_mistake: str | None = None
    what_different: str | None = None
    what_remember: str | None = None


class ExperienceOut(ExperienceCreate):
    id: uuid.UUID

    class Config:
        from_attributes = True
