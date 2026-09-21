import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.deps import get_current_user
from app.models.knowledge import Knowledge
from app.models.mastery import Mastery
from app.models.review_schedule import ReviewSchedule
from app.models.tag import Tag, KnowledgeTag
from app.models.user import User
from app.schemas.knowledge import KnowledgeCreate, KnowledgeOut, KnowledgeUpdate
from app.services.spaced_repetition import initial_schedule_values

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("", response_model=list[KnowledgeOut])
def list_knowledge(
    topic_id: uuid.UUID | None = None,
    favorite: bool | None = None,
    archived: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Knowledge).filter(Knowledge.user_id == user.id, Knowledge.is_archived == archived)
    if topic_id:
        query = query.filter(Knowledge.topic_id == topic_id)
    if favorite is not None:
        query = query.filter(Knowledge.is_favorite == favorite)
    return query.order_by(Knowledge.updated_at.desc()).all()


@router.post("", response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
def create_knowledge(payload: KnowledgeCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = Knowledge(
        user_id=user.id,
        topic_id=payload.topic_id,
        title=payload.title,
        type=payload.type,
        description=payload.description,
        my_understanding=payload.my_understanding,
        example=payload.example,
        source=payload.source,
        difficulty=payload.difficulty,
    )
    db.add(item)
    db.flush()  # get item.id before commit

    # tags: get-or-create per user, then link
    for tag_name in payload.tags:
        tag = db.query(Tag).filter(Tag.user_id == user.id, Tag.name == tag_name).first()
        if not tag:
            tag = Tag(user_id=user.id, name=tag_name)
            db.add(tag)
            db.flush()
        db.add(KnowledgeTag(knowledge_id=item.id, tag_id=tag.id))

    # every new knowledge item starts with a review schedule and mastery row
    db.add(ReviewSchedule(knowledge_id=item.id, **initial_schedule_values()))
    db.add(Mastery(knowledge_id=item.id, level=0))

    db.commit()
    db.refresh(item)
    return item


@router.get("/{knowledge_id}", response_model=KnowledgeOut)
def get_knowledge(knowledge_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(Knowledge).filter(Knowledge.id == knowledge_id, Knowledge.user_id == user.id).first()
    if not item:
        raise NotFoundError("Knowledge item not found")
    return item


@router.patch("/{knowledge_id}", response_model=KnowledgeOut)
def update_knowledge(
    knowledge_id: uuid.UUID,
    payload: KnowledgeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.query(Knowledge).filter(Knowledge.id == knowledge_id, Knowledge.user_id == user.id).first()
    if not item:
        raise NotFoundError("Knowledge item not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{knowledge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge(knowledge_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(Knowledge).filter(Knowledge.id == knowledge_id, Knowledge.user_id == user.id).first()
    if not item:
        raise NotFoundError("Knowledge item not found")
    db.delete(item)
    db.commit()
