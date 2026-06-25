/**
 * GHL Integration Tests
 * Validates the GHL API key and service layer connectivity.
 */
import { describe, expect, it } from "vitest";

describe("GHL API Key", () => {
  it("GHL_API_KEY environment variable is set", () => {
    expect(process.env.GHL_API_KEY).toBeTruthy();
    expect(typeof process.env.GHL_API_KEY).toBe("string");
    expect((process.env.GHL_API_KEY ?? "").length).toBeGreaterThan(10);
  });
});

describe("GHL Config", () => {
  it("has all required pipeline stage IDs", async () => {
    const { GHL_STAGES, GHL_PIPELINE_ID, GHL_LOCATION_ID } = await import("./ghl/config");
    expect(GHL_LOCATION_ID).toBe("t9b6FAsOCqtsJ57Zl5il");
    expect(GHL_PIPELINE_ID).toBe("NHCezPhyoywoNZ31hNXt");
    expect(GHL_STAGES.MEMBER_REGISTERED).toBe("0cc7a96b-ed9c-4bc9-987d-190dc7ab592a");
    expect(GHL_STAGES.ORDER_COMMITTED).toBe("197babac-f41d-4176-92db-0200fbfdc0c8");
    expect(GHL_STAGES.PAYMENT_PENDING).toBe("336a6722-7800-42b5-a49e-37d09eda5a48");
    expect(GHL_STAGES.PAYMENT_RECEIVED).toBe("b4b9a385-01ec-4f34-8dfe-d6af89112ac9");
    expect(GHL_STAGES.ORDER_PLACED_SUPPLIER).toBe("d91c5ab7-7e39-4538-a2d0-72aac764bcc1");
    expect(GHL_STAGES.TESTING_IN_PROGRESS).toBe("739c4e90-82f2-4282-a8ad-d3b60b172c06");
    expect(GHL_STAGES.READY_TO_SHIP).toBe("b56d3d7c-31a4-42aa-86fe-f7125dd50bca");
    expect(GHL_STAGES.SHIPPED).toBe("3f78b92a-3c7c-4338-acde-1937ddb7f68a");
    expect(GHL_STAGES.COMPLETED).toBe("3d718c6a-d151-477a-96de-ad48a4c5e5d1");
  });

  it("has all required custom field keys", async () => {
    const { GHL_FIELDS } = await import("./ghl/config");
    expect(GHL_FIELDS.MEMBER_SINCE).toBe("contact.pbg_member_since");
    expect(GHL_FIELDS.INVITE_CODE_USED).toBe("contact.pbg_invite_code_used");
    expect(GHL_FIELDS.TOTAL_ORDERS).toBe("contact.pbg_total_orders");
    expect(GHL_FIELDS.TOTAL_SPENT).toBe("contact.pbg_total_spent");
    expect(GHL_FIELDS.LAST_BUY_NAME).toBe("contact.pbg_last_buy_name");
    expect(GHL_FIELDS.LAST_ORDER_DATE).toBe("contact.pbg_last_order_date");
    expect(GHL_FIELDS.LAST_ORDER_STATUS).toBe("contact.pbg_last_order_status");
    expect(GHL_FIELDS.LAST_ORDER_AMOUNT).toBe("contact.pbg_last_order_amount");
    expect(GHL_FIELDS.LAST_TRACKING).toBe("contact.pbg_last_tracking_number");
    expect(GHL_FIELDS.LAST_CARRIER).toBe("contact.pbg_last_carrier");
    expect(GHL_FIELDS.COA_AVAILABLE).toBe("contact.pbg_coa_available");
  });
});

describe("GHL API Connectivity", () => {
  it("can reach the GHL contacts API with the provided key", async () => {
    const apiKey = process.env.GHL_API_KEY;
    if (!apiKey) {
      console.warn("[GHL Test] GHL_API_KEY not set, skipping connectivity test");
      return;
    }

    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=t9b6FAsOCqtsJ57Zl5il&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
      }
    );

    // 200 = valid key, 401 = invalid key, 403 = insufficient scope
    expect(res.status).not.toBe(401); // not unauthorized
    expect([200, 403, 422]).toContain(res.status); // valid key responses
  }, 15000);
});
