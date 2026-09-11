export const HEALTH_RATING_OPTIONS = [
  "Preferred Plus",
  "Preferred",
  "Select",
  "Standard",
  "Preferred Tobacco",
  "Standard Tobacco",
] as const;

export type HealthRating = (typeof HEALTH_RATING_OPTIONS)[number];

export function isValidHealthRating(value: unknown): value is HealthRating {
  return typeof value === "string" && (HEALTH_RATING_OPTIONS as readonly string[]).includes(value);
}
