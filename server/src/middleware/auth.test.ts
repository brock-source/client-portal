import { describe, it, expect, vi } from "vitest";
import { requireAuth, requireRole } from "./auth";

function mkReq(session: Record<string, unknown> = {}) {
  return { session } as any;
}

function mkRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("requireAuth", () => {
  it("returns 401 when there is no session user", () => {
    const req = mkReq({});
    const res = mkRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when a session user is present", () => {
    const req = mkReq({ userId: "u1" });
    const res = mkRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("requireRole", () => {
  it("returns 401 when unauthenticated", () => {
    const req = mkReq({});
    const res = mkRes();
    const next = vi.fn();

    requireRole("ADMIN")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when authenticated with the wrong role", () => {
    const req = mkReq({ userId: "u1", role: "CLIENT" });
    const res = mkRes();
    const next = vi.fn();

    requireRole("ADMIN")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when authenticated with the matching role", () => {
    const req = mkReq({ userId: "u1", role: "ADMIN" });
    const res = mkRes();
    const next = vi.fn();

    requireRole("ADMIN")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
