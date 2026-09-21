import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.deps import get_current_user
from app.models.category import Category
from app.models.topic import Topic
from app.models.user import User
from app.schemas.category import TopicCreate, TopicOut

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("", response_model=list[TopicOut])
def list_topics(
    category_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Topic).join(Category).filter(Category.user_id == user.id)
    if category_id:
        query = query.filter(Topic.category_id == category_id)
    return query.all()


@router.post("", response_model=TopicOut, status_code=status.HTTP_201_CREATED)
def create_topic(payload: TopicCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    category = db.query(Category).filter(Category.id == payload.category_id, Category.user_id == user.id).first()
    if not category:
        raise NotFoundError("Category not found")

    topic = Topic(category_id=payload.category_id, name=payload.name)
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(topic_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    topic = (
        db.query(Topic)
        .join(Category)
        .filter(Topic.id == topic_id, Category.user_id == user.id)
        .first()
    )
    if not topic:
        raise NotFoundError("Topic not found")
    db.delete(topic)
    db.commit()
