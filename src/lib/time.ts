/**
 * Global Reference "Today" for Project Udyam Digital
 * Per Hackathon spec: All date calculations (e.g. 90-day address proof validity,
 * lead timeline, activation delays) must use 2026-07-15 as "today".
 */
export const NOW = new Date("2026-07-15T00:00:00.000Z");
export const NOW_ISO = "2026-07-15";

export function getNow(): Date {
  return new Date(NOW.getTime());
}

/**
 * Validates if a document date is within `days` before NOW (default 90 days for address proofs)
 */
export function isWithinDays(dateString: string, days: number = 90): boolean {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    const diffMs = NOW.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Document must not be in the future relative to NOW, and within `days` old
    return diffDays >= 0 && diffDays <= days;
  } catch {
    return false;
  }
}

/**
 * Calculate business days from NOW
 */
export function addDaysFromNow(days: number): string {
  const target = new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
  return target.toISOString().split("T")[0];
}
