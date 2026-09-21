from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password, decode_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise ConflictError("An account with this email already exists")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise UnauthorizedError("Incorrect email or password")

    return Token(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=Token)
def refresh(refresh_token: str, db: Session = Depends(get_db)):
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise UnauthorizedError("Invalid token type")
    except Exception:
        raise UnauthorizedError("Invalid refresh token")

    user_id = payload["sub"]
    return Token(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )
