import { headers, cookies } from "next/headers";

export async function apiFetch(endpoint: string) {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;

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
