import uuid
from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    is_custom: bool = True


class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    is_custom: bool

    class Config:
        from_attributes = True


class TopicCreate(BaseModel):
    category_id: uuid.UUID
    name: str


class TopicOut(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    name: str

    class Config:
        from_attributes = True
