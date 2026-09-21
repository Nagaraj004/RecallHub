from pydantic import BaseModel


class DashboardOut(BaseModel):
    knowledge_items: int
    reviews_due: int
    mastered_topics: int
    recall_accuracy: float
    learning_streak: int
    practice_completed: int


class AnalyticsOut(BaseModel):
    total_knowledge: int
    total_reviews: int
    recall_accuracy: float
    failed_recalls: int
    successful_recalls: int
    mastery_distribution: dict[str, int]
    category_distribution: dict[str, int]
    frequently_forgotten: list[dict]
