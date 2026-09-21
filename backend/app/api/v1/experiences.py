from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.experience import Experience
from app.models.user import User
from app.schemas.journal import ExperienceCreate, ExperienceOut

router = APIRouter(prefix="/experiences", tags=["experiences"])


@router.get("", response_model=list[ExperienceOut])
def list_experiences(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(Experience)
        .filter(Experience.user_id == user.id)
        .order_by(Experience.experience_date.desc())
        .all()
    )


@router.post("", response_model=ExperienceOut, status_code=status.HTTP_201_CREATED)
def create_experience(payload: ExperienceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    experience = Experience(user_id=user.id, **payload.model_dump())
    db.add(experience)
    db.commit()
    db.refresh(experience)
    return experience
