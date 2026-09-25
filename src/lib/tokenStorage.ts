// Central place for reading/writing auth tokens. localStorage is what the app
// reads from (axios interceptors, client components); the mirrored cookies exist
// only so middleware.ts (which runs on the server and can't see localStorage) can
// gate /merchant/* routes.

const ONE_DAY = 60 * 60 * 24;
const SEVEN_DAYS = ONE_DAY * 7;

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken") || localStorage.getItem("token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

export function setAccessToken(accessToken: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("token", accessToken);
  setCookie("accessToken", accessToken, ONE_DAY);
  setCookie("token", accessToken, ONE_DAY);
}

export function setRefreshToken(refreshToken: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("refreshToken", refreshToken);
  setCookie("refreshToken", refreshToken, SEVEN_DAYS);
}

export function setTokens(accessToken: string, refreshToken?: string | null) {
  setAccessToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);
}

// The access token's `kycStatus` claim is only ever refreshed on login, so it
// goes stale the moment a merchant finishes onboarding within the same
// session. proxy.ts checks this cookie before falling back to the (possibly
// stale) JWT claim — call this right after a KYC decision so the merchant
// isn't bounced back into the onboarding form it just completed.
export function setKycStatus(status: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("kycStatus", status);
  setCookie("kycStatus", status, ONE_DAY);
}

// Wipes everything the auth lifecycle touches - both tokens, the cached user,
// and the KYC override cookie set after onboarding (so a fresh login on the
// same browser never inherits a stale status from a previous session).
export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("kycStatus");
  clearCookie("accessToken");
  clearCookie("token");
  clearCookie("refreshToken");
  clearCookie("kycStatus");
}
