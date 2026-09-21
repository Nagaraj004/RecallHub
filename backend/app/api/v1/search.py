from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.knowledge import Knowledge
from app.models.tag import Tag, KnowledgeTag
from app.models.topic import Topic
from app.models.category import Category
from app.models.user import User
from app.schemas.knowledge import KnowledgeOut

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=list[KnowledgeOut])
def search_knowledge(q: str = Query(..., min_length=1), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    like = f"%{q}%"

    tag_knowledge_ids = (
        db.query(KnowledgeTag.knowledge_id)
        .join(Tag)
        .filter(Tag.user_id == user.id, Tag.name.ilike(like))
    )

    results = (
        db.query(Knowledge)
        .join(Topic)
        .join(Category)
        .filter(
            Knowledge.user_id == user.id,
            or_(
                Knowledge.title.ilike(like),
                Knowledge.description.ilike(like),
                Knowledge.my_understanding.ilike(like),
                Topic.name.ilike(like),
                Category.name.ilike(like),
                Knowledge.id.in_(tag_knowledge_ids.scalar_subquery()),
            ),
        )
        .distinct()
        .all()
    )
    return results
