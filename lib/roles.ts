/**
 * Standardizes role strings from different formats (e.g. Office/Admin, Tech/Admin)
 * to internal normalized strings (office_admin, tech_admin).
 */
export function normalizeRole(role: string): string {
  const norm = role.toLowerCase().trim();
  if (norm === "office/admin" || norm === "office-admin" || norm === "office_admin") {
    return "office_admin";
  }
  if (norm === "tech-admin" || norm === "tech/admin" || norm === "tech_admin") {
    return "tech_admin";
  }
  return norm;
}
