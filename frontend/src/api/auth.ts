import { apiClient } from "./client";

export interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export async function login(email: string, password: string): Promise<Tokens> {
  const { data } = await apiClient.post<Tokens>("/auth/login", { email, password });
  return data;
}

export async function register(email: string, password: string, display_name?: string) {
  const { data } = await apiClient.post("/auth/register", { email, password, display_name });
  return data;
}
