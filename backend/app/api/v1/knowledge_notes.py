import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.deps import get_current_user
from app.models.knowledge import Knowledge
from app.models.knowledge_note import KnowledgeNote
from app.models.user import User
from app.schemas.knowledge_note import KnowledgeNoteCreate, KnowledgeNoteOut, KnowledgeNoteUpdate

router = APIRouter(prefix="/knowledge", tags=["knowledge-notes"])


@router.get("/{knowledge_id}/notes", response_model=list[KnowledgeNoteOut])
def list_notes(
    knowledge_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    knowledge = db.query(Knowledge).filter(Knowledge.id == knowledge_id, Knowledge.user_id == user.id).first()
    if not knowledge:
        raise NotFoundError("Knowledge item not found")

    return (
        db.query(KnowledgeNote)
        .filter(KnowledgeNote.knowledge_id == knowledge_id)
        .order_by(KnowledgeNote.created_at.desc())
        .all()
    )


@router.post("/{knowledge_id}/notes", response_model=KnowledgeNoteOut, status_code=status.HTTP_201_CREATED)
def create_note(
    knowledge_id: uuid.UUID,
    payload: KnowledgeNoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    knowledge = db.query(Knowledge).filter(Knowledge.id == knowledge_id, Knowledge.user_id == user.id).first()
    if not knowledge:
        raise NotFoundError("Knowledge item not found")

    note = KnowledgeNote(
        knowledge_id=knowledge_id,
        label=payload.label,
        content=payload.content,
        canvas_data=payload.canvas_data,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.patch("/{knowledge_id}/notes/{note_id}", response_model=KnowledgeNoteOut)
def update_note(
    knowledge_id: uuid.UUID,
    note_id: uuid.UUID,
    payload: KnowledgeNoteUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    knowledge = db.query(Knowledge).filter(Knowledge.id == knowledge_id, Knowledge.user_id == user.id).first()
    if not knowledge:
        raise NotFoundError("Knowledge item not found")

    note = (
        db.query(KnowledgeNote)
        .filter(KnowledgeNote.id == note_id, KnowledgeNote.knowledge_id == knowledge_id)
        .first()
    )
    if not note:
        raise NotFoundError("Knowledge note not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(note, field, value)

    db.commit()
    db.refresh(note)
    return note


@router.delete("/{knowledge_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    knowledge_id: uuid.UUID,
    note_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    knowledge = db.query(Knowledge).filter(Knowledge.id == knowledge_id, Knowledge.user_id == user.id).first()
    if not knowledge:
        raise NotFoundError("Knowledge item not found")

    note = (
        db.query(KnowledgeNote)
        .filter(KnowledgeNote.id == note_id, KnowledgeNote.knowledge_id == knowledge_id)
        .first()
    )
    if not note:
        raise NotFoundError("Knowledge note not found")

    db.delete(note)
    db.commit()
