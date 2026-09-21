import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging

configure_logging()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_PREFIX}/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
def startup_db_check():
    import logging
    logger = logging.getLogger(__name__)
    try:
        from app.db.session import engine
        from app.db.base_class import Base
        import app.models.push_subscription  # registers PushSubscription in Base.metadata
        import sqlalchemy as sa

        Base.metadata.create_all(bind=engine, checkfirst=True)

        with engine.begin() as conn:
            conn.execute(sa.text("ALTER TABLE knowledge_notes ADD COLUMN IF NOT EXISTS canvas_data TEXT;"))
        logger.info("Database startup check completed successfully.")

        # Ensure PWA icons are generated
        try:
            import sys
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            sys.path.insert(0, root_dir)
            from scripts.generate_icons import generate_all
            generate_all()
        except Exception as icon_err:
            logger.warning(f"Could not generate PWA icons: {icon_err}")
    except Exception as e:
        logger.warning(f"Could not check/create tables on startup: {e}")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME, "pwa": True}


