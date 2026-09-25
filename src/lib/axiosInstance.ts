import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3010";

const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

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
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url || "";
    const isAuthEndpoint = url.startsWith("/auth/");

    // A 401 on a protected route means the session is invalid/expired - clear it
    // and bounce to login. Skip this for the auth endpoints themselves (e.g. a
    // wrong-password login attempt also returns 401, and that should just show
    // an inline error, not force a redirect).
    if (status === 401 && !isAuthEndpoint && typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      document.cookie = "accessToken=; path=/; max-age=0";
      document.cookie = "token=; path=/; max-age=0";
      document.cookie = "refreshToken=; path=/; max-age=0";
      if (window.location.pathname !== "/auth/login") {
        window.location.href = "/auth/login";
      }
    }

    const normalized = {
      message:
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
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
