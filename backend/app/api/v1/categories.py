import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.deps import get_current_user
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])

DEFAULT_CATEGORIES = [
    "Technology", "Finance", "Books", "English",
    "Personal Development", "General Knowledge",
]


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Category).filter(Category.user_id == user.id).all()


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    category = Category(user_id=user.id, name=payload.name, is_custom=payload.is_custom)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.post("/seed-defaults", response_model=list[CategoryOut])
def seed_default_categories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Creates the standard starter categories from the roadmap, if not already present."""
    existing_names = {c.name for c in db.query(Category).filter(Category.user_id == user.id).all()}
    created = []
    for name in DEFAULT_CATEGORIES:
        if name not in existing_names:
            category = Category(user_id=user.id, name=name, is_custom=False)
            db.add(category)
            created.append(category)
    db.commit()
    for c in created:
        db.refresh(c)
    return db.query(Category).filter(Category.user_id == user.id).all()


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    category = db.query(Category).filter(Category.id == category_id, Category.user_id == user.id).first()
    if not category:
        raise NotFoundError("Category not found")
    db.delete(category)
    db.commit()
