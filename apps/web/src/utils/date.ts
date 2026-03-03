/**
 * Formats a date string (YYYY-MM-DD or full ISO) for display.
 * Examples: "2026-02-27" → "Feb 27, 2026"
 *           "2026-02-27T05:00:00.000Z" → "Feb 27, 2026, 5:00 AM"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  try {
    const parsed = dateStr.includes("T") ? dateStr : dateStr + "T12:00:00Z";
    const d = new Date(parsed);
    if (Number.isNaN(d.getTime())) return dateStr;
    const hasTime = dateStr.includes("T") && /T\d{2}:\d{2}/.test(dateStr);
    if (hasTime) {
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
