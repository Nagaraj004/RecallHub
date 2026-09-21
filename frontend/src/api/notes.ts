import { apiClient } from "./client";

export interface KnowledgeNote {
  id: string;
  knowledge_id: string;
  label: string;
  content: string;
  canvas_data?: string | null;
  created_at: string;
  updated_at: string;
}

export function getFullImageUrl(url: string): string {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  // Derive origin from API URL (e.g. "http://localhost:8000/api/v1" -> "http://localhost:8000")
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
  try {
    const origin = new URL(apiUrl).origin;
    return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
  } catch {
    return url;
  }
}

export async function listNotes(knowledgeId: string): Promise<KnowledgeNote[]> {
  const { data } = await apiClient.get<KnowledgeNote[]>(`/knowledge/${knowledgeId}/notes`);
  return data;
}

export async function createNote(
  knowledgeId: string,
  payload: { label?: string; content: string; canvas_data?: string | null }
): Promise<KnowledgeNote> {
  const { data } = await apiClient.post<KnowledgeNote>(`/knowledge/${knowledgeId}/notes`, payload);
  return data;
}

export async function updateNote(
  knowledgeId: string,
  noteId: string,
  payload: { label?: string; content?: string; canvas_data?: string | null }
): Promise<KnowledgeNote> {
  const { data } = await apiClient.patch<KnowledgeNote>(
    `/knowledge/${knowledgeId}/notes/${noteId}`,
    payload
  );
  return data;
}


export async function deleteNote(knowledgeId: string, noteId: string): Promise<void> {
  await apiClient.delete(`/knowledge/${knowledgeId}/notes/${noteId}`);
}

export async function uploadImage(
  file: File
): Promise<{ url: string; filename: string; content_type: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<{
    url: string;
    filename: string;
    content_type: string;
  }>("/uploads/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
}
