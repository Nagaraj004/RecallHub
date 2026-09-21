import os
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/images")
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if file.content_type not in settings.ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported media type: {file.content_type}. Allowed types: {', '.join(settings.ALLOWED_IMAGE_CONTENT_TYPES)}",
        )

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    ext = os.path.splitext(file.filename or "")[1].lower()
    if not ext:
        ext_map = {
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }
        ext = ext_map.get(file.content_type or "", "")

    filename = f"{uuid.uuid4()}{ext}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "url": f"/uploads/{filename}",
        "filename": filename,
        "content_type": file.content_type,
    }
