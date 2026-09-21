from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.idea import Idea
from app.models.user import User
from app.schemas.journal import IdeaCreate, IdeaOut

router = APIRouter(prefix="/ideas", tags=["ideas"])


@router.get("", response_model=list[IdeaOut])
def list_ideas(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Idea).filter(Idea.user_id == user.id).order_by(Idea.created_at.desc()).all()


@router.post("", response_model=IdeaOut, status_code=status.HTTP_201_CREATED)
def create_idea(payload: IdeaCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    idea = Idea(user_id=user.id, **payload.model_dump())
    db.add(idea)
    db.commit()
    db.refresh(idea)
    return idea
