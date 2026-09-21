import uuid
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise UnauthorizedError("Invalid token type")
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise UnauthorizedError("Could not validate credentials")

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("User not found or inactive")
    return user
