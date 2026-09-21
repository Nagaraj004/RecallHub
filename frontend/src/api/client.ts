import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Queue & dedupe concurrent refresh token requests
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function onRefreshFailed() {
  refreshSubscribers.forEach((cb) => cb(null));
  refreshSubscribers = [];
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Only attempt refresh on 401 errors for authenticated API calls (not login/register/refresh itself)
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      const refreshToken = localStorage.getItem("refresh_token");

      if (!refreshToken) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until the in-flight refresh completes
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken: string | null) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiClient(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call /auth/refresh with refresh_token query parameter
        const res = await axios.post<{ access_token: string; refresh_token: string }>(
          `${API_URL}/auth/refresh`,
          null,
          { params: { refresh_token: refreshToken } }
        );

        const { access_token, refresh_token: newRefreshToken } = res.data;
        localStorage.setItem("access_token", access_token);
        if (newRefreshToken) {
          localStorage.setItem("refresh_token", newRefreshToken);
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        onRefreshed(access_token);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        onRefreshFailed();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
