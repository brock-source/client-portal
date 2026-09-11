import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "./client";

const originalFetch = globalThis.fetch;

function mockFetch(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("api request helper (via api.me)", () => {
  it("returns the parsed JSON body on a successful response", async () => {
    const me = { id: "u1", email: "a@b.com", role: "CLIENT", client: null };
    const fetchMock = mockFetch({ ok: true, status: 200, json: async () => me });

    const result = await api.me();

    expect(result).toEqual(me);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("throws with the server's error message on a non-2xx response", async () => {
    mockFetch({ ok: false, status: 401, json: async () => ({ error: "Not authenticated" }) });

    await expect(api.me()).rejects.toThrow("Not authenticated");
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("invalid json");
      },
    });

    await expect(api.me()).rejects.toThrow("Request failed: 500");
  });

  it("returns undefined for a 204 response without parsing a body", async () => {
    const json = vi.fn();
    mockFetch({ ok: true, status: 204, json });

    const result = await api.logout();

    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });
});
