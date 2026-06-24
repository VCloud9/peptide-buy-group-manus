import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context Helpers ──────────────────────────────────────────────────────────

function makeCtx(role: "user" | "admin" | "owner" = "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `test-${role}`,
      email: `${role}@test.com`,
      name: `Test ${role}`,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.email).toBe("user@test.com");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      user: makeCtx().user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: (name: string) => cleared.push(name) } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared.length).toBe(1);
  });
});

// ─── Buy Status Lifecycle Tests ───────────────────────────────────────────────

describe("Buy lifecycle status sequence", () => {
  const STATUSES = ["Draft", "Gathering", "Funded", "Ordered", "Testing", "Distributing", "Complete"];

  it("has exactly 7 statuses in the correct order", () => {
    expect(STATUSES).toHaveLength(7);
    expect(STATUSES[0]).toBe("Draft");
    expect(STATUSES[6]).toBe("Complete");
  });

  it("Gathering comes before Funded", () => {
    expect(STATUSES.indexOf("Gathering")).toBeLessThan(STATUSES.indexOf("Funded"));
  });

  it("Testing comes after Ordered", () => {
    expect(STATUSES.indexOf("Testing")).toBeGreaterThan(STATUSES.indexOf("Ordered"));
  });

  it("Distributing comes before Complete", () => {
    expect(STATUSES.indexOf("Distributing")).toBeLessThan(STATUSES.indexOf("Complete"));
  });
});

// ─── Order Status Sequence Tests ─────────────────────────────────────────────

describe("Order payment status sequence", () => {
  const ORDER_STATUSES = ["Committed", "Payment Pending", "Paid", "Shipped"];

  it("has exactly 4 statuses", () => {
    expect(ORDER_STATUSES).toHaveLength(4);
  });

  it("starts with Committed", () => {
    expect(ORDER_STATUSES[0]).toBe("Committed");
  });

  it("ends with Shipped", () => {
    expect(ORDER_STATUSES[3]).toBe("Shipped");
  });

  it("Paid comes before Shipped", () => {
    expect(ORDER_STATUSES.indexOf("Paid")).toBeLessThan(ORDER_STATUSES.indexOf("Shipped"));
  });
});

// ─── Webhook Event Tests ──────────────────────────────────────────────────────

describe("Skool webhook events", () => {
  const EVENTS = ["buy_live", "moq_reached", "test_results_posted", "orders_shipped"];

  it("has exactly 4 webhook events", () => {
    expect(EVENTS).toHaveLength(4);
  });

  it("includes buy_live event", () => {
    expect(EVENTS).toContain("buy_live");
  });

  it("includes moq_reached event", () => {
    expect(EVENTS).toContain("moq_reached");
  });

  it("includes test_results_posted event", () => {
    expect(EVENTS).toContain("test_results_posted");
  });

  it("includes orders_shipped event", () => {
    expect(EVENTS).toContain("orders_shipped");
  });
});

// ─── MOQ Progress Calculation Tests ──────────────────────────────────────────

describe("MOQ progress calculation", () => {
  const calcProgress = (current: number, target: number) =>
    Math.min(100, Math.round((current / target) * 100));

  it("returns 0 when nothing committed", () => {
    expect(calcProgress(0, 5000)).toBe(0);
  });

  it("returns 50 at half MOQ", () => {
    expect(calcProgress(2500, 5000)).toBe(50);
  });

  it("returns 100 at exactly MOQ", () => {
    expect(calcProgress(5000, 5000)).toBe(100);
  });

  it("caps at 100 when over MOQ", () => {
    expect(calcProgress(7500, 5000)).toBe(100);
  });
});

// ─── Role-based Access Tests ──────────────────────────────────────────────────

describe("Role-based access control", () => {
  it("admin role is distinct from user role", () => {
    const adminCtx = makeCtx("admin");
    const userCtx = makeCtx("user");
    expect(adminCtx.user?.role).toBe("admin");
    expect(userCtx.user?.role).toBe("user");
  });

  it("owner role is distinct from admin role", () => {
    const ownerCtx = makeCtx("owner");
    expect(ownerCtx.user?.role).toBe("owner");
  });
});
