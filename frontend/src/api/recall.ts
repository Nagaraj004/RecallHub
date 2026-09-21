import { apiClient } from "./client";

export interface RecallQuestion {
  id: string;
  knowledge_id: string;
  question_text: string;
  question_type: string;
}

export async function createQuestion(
  knowledge_id: string,
  question_text: string,
  question_type = "short_answer"
) {
  const { data } = await apiClient.post<RecallQuestion>("/recall/questions", {
    knowledge_id,
    question_text,
    question_type,
  });
  return data;
}

export async function listQuestions(knowledge_id: string) {
  const { data } = await apiClient.get<RecallQuestion[]>(`/recall/questions/${knowledge_id}`);
  return data;
}

export type RecallResult = "forgot" | "difficult" | "partial" | "good" | "easy";

export async function submitRecall(payload: {
  question_id: string;
  user_answer?: string;
  confidence_before_reveal?: number;
  result: RecallResult;
}) {
  const { data } = await apiClient.post("/recall/submit", payload);
  return data;
}
