import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { clearTokens, getRefreshToken, setAccessToken } from "./tokenStorage";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3010";

const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

type RetriableRequestConfig = AxiosRequestConfig & {
  _authRetry?: boolean;
};

let refreshPromise: Promise<string> | null = null;

function redirectToLogin() {
  if (typeof window === "undefined") return;

  clearTokens();
  if (window.location.pathname !== "/auth/login") {
    window.location.href = "/auth/login";
  }
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  // Use the plain axios client here so a failed refresh cannot recursively
  // trigger this same response interceptor.
  const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken }, {
    headers: { "Content-Type": "application/json" },
    timeout: 60000,
  });

  const accessToken = response.data?.data?.accessToken ?? response.data?.accessToken;
  if (!accessToken) throw new Error("Refresh response did not include an access token");

  setAccessToken(accessToken);
  return accessToken;
}

function getOrCreateRefreshPromise() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined" && config && config.headers) {
      const token = localStorage.getItem("token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url || "";
    const isAuthEndpoint = url.startsWith("/auth/");
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    // Access tokens are short-lived. Refresh them once before clearing the
    // session. Auth endpoints are skipped so login/registration validation
    // errors remain visible on their own pages.
    if (status === 401 && !isAuthEndpoint && typeof window !== "undefined") {
      if (originalRequest && !originalRequest._authRetry) {
        originalRequest._authRetry = true;

        try {
          const accessToken = await getOrCreateRefreshPromise();
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${accessToken}`,
          };
          return axiosInstance(originalRequest);
        } catch {
          redirectToLogin();
        }
      }
    }

    const responseData = error?.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined;
    const normalized = {
      message:
        responseData?.error?.message ||
        responseData?.message ||
        error?.message ||
        "Network Error",
      status,
      data: error?.response?.data || null,
    };
    return Promise.reject(normalized);
  }
);

export function setAuthToken(token: string | null) {
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }

  if (token) axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete axiosInstance.defaults.headers.common["Authorization"];
}

export default axiosInstance;
