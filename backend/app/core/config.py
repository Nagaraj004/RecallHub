from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "RecallHub"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+psycopg2://postgres:password@localhost:5432/recallhub"

    SECRET_KEY: str = "change-this-to-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 5
    ALLOWED_IMAGE_CONTENT_TYPES: list[str] = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
    ]

    # Web Push / VAPID configuration
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_CLAIM_EMAIL: str = "mailto:support@recallhub.local"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

