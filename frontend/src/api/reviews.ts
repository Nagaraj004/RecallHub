import { apiClient } from "./client";

export interface DueItem {
  knowledge_id: string;
  knowledge_title: string;
  question_id: string | null;
  question_text: string | null;
  next_review_date: string;
  status: string;
  interval_days: number;
}

export interface ReviewQueue {
  overdue: DueItem[];
  due_today: DueItem[];
  upcoming: DueItem[];
  leeches: DueItem[];
}

export async function getReviewQueue() {
  const { data } = await apiClient.get<ReviewQueue>("/reviews/queue");
  return data;
}
