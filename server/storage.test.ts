import { describe, expect, it } from "vitest";
import { storageReference } from "./storage";

describe("Supabase COA storage references", () => {
  it("uses the private Supabase Storage bucket reference", () => {
    expect(storageReference("vendor-coas/15/coa.pdf")).toBe(
      "supabase-storage://coa-documents/vendor-coas/15/coa.pdf",
    );
  });

  it("normalizes leading slashes from persisted file keys", () => {
    expect(storageReference("///coa/7/result.pdf")).toBe(
      "supabase-storage://coa-documents/coa/7/result.pdf",
    );
  });
});
