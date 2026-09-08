// Client-side CSRF token utilities for browser environments

// Retrieve CSRF token from browser cookies
export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Fetch a fresh CSRF token from the API if cookie is absent
export async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/csrf");
    if (!res.ok) return null;
    const data = await res.json();
    return data.csrfToken || getCsrfTokenFromCookie();
  } catch (error) {
    console.error("[CSRF Client] Failed to fetch CSRF token:", error);
    return null;
  }
}

// Ensure a CSRF token exists (returns cookie token or fetches new one)
export async function ensureCsrfToken(): Promise<string | null> {
  const existing = getCsrfTokenFromCookie();
  if (existing) return existing;
  return await fetchCsrfToken();
}

// Helper to return headers record containing X-CSRF-Token if available
export function getCsrfHeaders(
  customHeaders: Record<string, string> = {},
  tokenOverride?: string | null
): Record<string, string> {
  const token = tokenOverride || getCsrfTokenFromCookie();
  if (token) {
    return {
      ...customHeaders,
      "X-CSRF-Token": token,
    };
  }
  return customHeaders;
}

