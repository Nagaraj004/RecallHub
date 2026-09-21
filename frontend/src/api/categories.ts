import { apiClient } from "./client";

export interface Category {
  id: string;
  name: string;
  is_custom: boolean;
}

export interface Topic {
  id: string;
  category_id: string;
  name: string;
}

export async function listCategories() {
  const { data } = await apiClient.get<Category[]>("/categories");
  return data;
}

export async function seedDefaultCategories() {
  const { data } = await apiClient.post<Category[]>("/categories/seed-defaults");
  return data;
}

export async function createCategory(name: string) {
  const { data } = await apiClient.post<Category>("/categories", { name });
  return data;
}

export async function listTopics(category_id?: string) {
  const { data } = await apiClient.get<Topic[]>("/topics", { params: { category_id } });
  return data;
}

export async function createTopic(category_id: string, name: string) {
  const { data } = await apiClient.post<Topic>("/topics", { category_id, name });
  return data;
}
