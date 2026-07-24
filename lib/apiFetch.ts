import { headers, cookies } from "next/headers";

export async function apiFetch(endpoint: string) {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || (host && !host.includes("localhost") && !host.includes("127.0.0.1") ? "https" : "http");
  const baseUrl = host ? `${protocol}://${host}` : "http://127.0.0.1:3000";

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch from ${endpoint}: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
