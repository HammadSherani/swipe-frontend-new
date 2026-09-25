import { isAxiosError } from "axios";
import toast from "react-hot-toast";

interface NormalizedError {
  message: string;
  status?: number;
  data?: {
    message?: string;
    error?: { code?: string; message?: string };
    [key: string]: any;
  } | null;
}

export default function handleError(error: unknown): void {
  if (isAxiosError(error)) {
    if (error.message === "canceled") {
      return;
    }
    const apiMessage = error.response?.data?.error?.message || error.response?.data?.message;
    toast.error(apiMessage || error.message);
    return;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as any).message === "string"
  ) {
    const normalized = error as NormalizedError;
    const apiMessage = normalized.data?.error?.message || normalized.data?.message;
    toast.error(apiMessage || normalized.message);
    return;
  }

  console.error("Error:", error);
}
