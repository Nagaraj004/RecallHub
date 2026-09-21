import { apiClient } from "./client";

export interface PracticeItem {
  id: string;
  knowledge_id: string;
  type: string;
  prompt: string;
  expected_answer: string | null;
}

export interface PracticeAttemptResult {
  id: string;
  practice_item_id: string;
  self_rated_correct: boolean | null;
  new_mastery_level: number | null;
}

export async function createPracticeItem(payload: {
  knowledge_id: string;
  type?: string;
  prompt: string;
  expected_answer?: string;
}) {
  const { data } = await apiClient.post<PracticeItem>("/practice/items", payload);
  return data;
}

export async function listPracticeItems(knowledge_id: string) {
  const { data } = await apiClient.get<PracticeItem[]>(`/practice/items/${knowledge_id}`);
  return data;
}

export async function submitPracticeAttempt(payload: {
  practice_item_id: string;
  user_answer?: string;
  self_rated_correct?: boolean;
}) {
  const { data } = await apiClient.post<PracticeAttemptResult>("/practice/attempts", payload);
  return data;
}
