from fastapi import APIRouter

from app.api.v1 import (
    auth, categories, topics, knowledge, search,
    recall, reviews, dashboard, analytics, practice,
    ideas, experiences, knowledge_notes, uploads, push,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(categories.router)
api_router.include_router(topics.router)
api_router.include_router(knowledge.router)
api_router.include_router(knowledge_notes.router)
api_router.include_router(uploads.router)
api_router.include_router(search.router)
api_router.include_router(recall.router)
api_router.include_router(reviews.router)
api_router.include_router(dashboard.router)
api_router.include_router(analytics.router)
api_router.include_router(practice.router)
api_router.include_router(ideas.router)
api_router.include_router(experiences.router)
api_router.include_router(push.router)

