import { apiClient } from "./client";

export interface DashboardData {
  knowledge_items: number;
  reviews_due: number;
  mastered_topics: number;
  recall_accuracy: number;
  learning_streak: number;
  practice_completed: number;
}

export async function getDashboard() {
  const { data } = await apiClient.get<DashboardData>("/dashboard");
  return data;
}
