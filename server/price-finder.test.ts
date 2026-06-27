import { describe, expect, it } from "vitest";
import { calcEffectivePrice } from "./db";
import type { VendorSkuTier } from "../drizzle/schema";

// ─── calcEffectivePrice unit tests ────────────────────────────────────────────

describe("calcEffectivePrice", () => {
  const noTiers: VendorSkuTier[] = [];

  it("returns list price when no tiers and no discount", () => {
    const result = calcEffectivePrice("50.00", noTiers, 1, null);
    expect(result.listPrice).toBe(50);
    expect(result.tierPrice).toBe(50);
    expect(result.effectivePrice).toBe(50);
    expect(result.savingsPct).toBe(0);
  });

  it("applies negotiated discount when no tiers", () => {
    const result = calcEffectivePrice("100.00", noTiers, 1, "10");
    expect(result.effectivePrice).toBe(90);
    expect(result.savingsPct).toBe(10);
  });

  it("applies the correct tier price for a given qty", () => {
    const tiers: VendorSkuTier[] = [
      { id: 1, vendorSkuId: 1, minQty: 10, price: "40.00" as any },
      { id: 2, vendorSkuId: 1, minQty: 20, price: "35.00" as any },
      { id: 3, vendorSkuId: 1, minQty: 50, price: "30.00" as any },
    ];

    // qty=1 → no tier applies → base price
    expect(calcEffectivePrice("50.00", tiers, 1, null).tierPrice).toBe(50);

    // qty=10 → first tier applies
    expect(calcEffectivePrice("50.00", tiers, 10, null).tierPrice).toBe(40);

    // qty=25 → second tier (minQty=20) applies, not third
    expect(calcEffectivePrice("50.00", tiers, 25, null).tierPrice).toBe(35);

    // qty=50 → third tier applies
    expect(calcEffectivePrice("50.00", tiers, 50, null).tierPrice).toBe(30);
  });

  it("applies both tier price and negotiated discount", () => {
    const tiers: VendorSkuTier[] = [
      { id: 1, vendorSkuId: 1, minQty: 20, price: "40.00" as any },
    ];
    // qty=20 → tier price $40, then 10% discount → $36
    const result = calcEffectivePrice("50.00", tiers, 20, "10");
    expect(result.tierPrice).toBe(40);
    expect(result.effectivePrice).toBe(36);
  });

  it("rounds effectivePrice to 2 decimal places", () => {
    // $33.33 * (1 - 0.10) = $29.997 → rounds to $30.00
    const result = calcEffectivePrice("33.33", noTiers, 1, "10");
    expect(result.effectivePrice).toBe(30);
  });

  it("calculates savingsPct relative to list price", () => {
    // list $50, effective $40 → 20% savings
    const result = calcEffectivePrice("50.00", noTiers, 1, "20");
    expect(result.savingsPct).toBe(20);
  });

  it("handles zero base price without dividing by zero", () => {
    const result = calcEffectivePrice("0.00", noTiers, 1, null);
    expect(result.savingsPct).toBe(0);
    expect(result.effectivePrice).toBe(0);
  });
});

// ─── groupByCompound logic tests ──────────────────────────────────────────────

describe("Price Finder groupByCompound logic", () => {
  it("identifies the vendor with the lowest ep1 as bestVendorId", () => {
    const rows = [
      { skuId: 1, vendorId: 10, vendorName: "Vendor A", name: "Retatrutide", ep1: 80, ep10: 70, ep20: 60, ep50: 50 },
      { skuId: 2, vendorId: 20, vendorName: "Vendor B", name: "Retatrutide", ep1: 75, ep10: 65, ep20: 55, ep50: 45 },
      { skuId: 3, vendorId: 30, vendorName: "Vendor C", name: "Retatrutide", ep1: 90, ep10: 80, ep20: 70, ep50: 60 },
    ];

    // Simulate groupByCompound logic
    const sorted = [...rows].sort((a, b) => a.ep1 - b.ep1);
    const bestVendorId = sorted[0].vendorId;

    expect(bestVendorId).toBe(20); // Vendor B has lowest ep1=75
  });

  it("groups case-insensitively by compound name", () => {
    const rows = [
      { name: "BPC-157", vendorId: 1, ep1: 30 },
      { name: "bpc-157", vendorId: 2, ep1: 28 },
      { name: "BPC-157 ", vendorId: 3, ep1: 32 }, // trailing space
    ];

    const map = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.name.trim().toLowerCase();
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }

    expect(map.size).toBe(1); // all three group together
    expect(map.get("bpc-157")?.length).toBe(3);
  });
});
