import { apiClient } from "./client";

export interface Knowledge {
  id: string;
  topic_id: string;
  title: string;
  type: string;
  description: string | null;
  my_understanding: string | null;
  example: string | null;
  source: string | null;
  difficulty: number;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewHistoryItem {
  id: string;
  result: string;
  confidence_before_reveal: number | null;
  answered_at: string;
}

export async function listKnowledge(params?: { topic_id?: string; favorite?: boolean; archived?: boolean }) {
  const { data } = await apiClient.get<Knowledge[]>("/knowledge", { params });
  return data;
}

export async function createKnowledge(
  payload: Partial<Knowledge> & { topic_id: string; title: string; tags?: string[] }
) {
  const { data } = await apiClient.post<Knowledge>("/knowledge", payload);
  return data;
}

export async function getKnowledge(id: string) {
  const { data } = await apiClient.get<Knowledge>(`/knowledge/${id}`);
  return data;
}

export async function updateKnowledge(id: string, payload: Partial<Knowledge>) {
  const { data } = await apiClient.patch<Knowledge>(`/knowledge/${id}`, payload);
  return data;
}

export async function deleteKnowledge(id: string) {
  await apiClient.delete(`/knowledge/${id}`);
}

export async function getReviewHistory(knowledgeId: string) {
  const { data } = await apiClient.get<ReviewHistoryItem[]>(`/reviews/history/${knowledgeId}`);
  return data;
}

export async function searchKnowledge(query: string) {
  const { data } = await apiClient.get<Knowledge[]>("/search", { params: { q: query } });
  return data;
}
