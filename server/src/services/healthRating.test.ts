import { describe, it, expect } from "vitest";
import { HEALTH_RATING_OPTIONS, isValidHealthRating } from "./healthRating";

describe("isValidHealthRating", () => {
  it("accepts every option in the approved list", () => {
    for (const option of HEALTH_RATING_OPTIONS) {
      expect(isValidHealthRating(option)).toBe(true);
    }
  });

  it("rejects free text that isn't one of the approved options", () => {
    expect(isValidHealthRating("Plus Plus")).toBe(false);
    expect(isValidHealthRating("preferred plus")).toBe(false); // case-sensitive on purpose
    expect(isValidHealthRating("")).toBe(false);
  });

  it("rejects non-string and missing values", () => {
    expect(isValidHealthRating(undefined)).toBe(false);
    expect(isValidHealthRating(null)).toBe(false);
    expect(isValidHealthRating(42)).toBe(false);
  });
});
