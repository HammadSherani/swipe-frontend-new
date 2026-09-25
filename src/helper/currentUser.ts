import { jwtDecode } from "jwt-decode";
import { getAccessToken } from "@/lib/tokenStorage";

export interface DecodedUser {
  id: string;
  email: string;
  role: string;
  exp: number;
  kycStatus?: string;
}

// Reads the current user's id/role straight from the stored access token, so
// UI (e.g. admin maker-checker gating) doesn't need a round-trip just to know
// "who am I".
export function getCurrentUser(): DecodedUser | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    return jwtDecode<DecodedUser>(token);
  } catch {
    return null;
  }
}
