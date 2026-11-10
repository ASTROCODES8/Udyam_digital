import { describe, it, expect } from "vitest";
import {
  eligibility,
  checkDependencies,
  priceLine,
  buildQuote,
  getDefaultBundle,
  type BusinessProfile,
} from "../src/lib/rules";

describe("Project Udyam Digital — Rules Engine Unit Tests", () => {
  // ── Baseline profiles ────────────────────────────────────────────────────────
  const baseMicroProfile: BusinessProfile = {
    segment: "micro",
    city_tier: 2,
    employee_count: 2,
    num_sites: 1,
    has_valid_gstin: false,
    gstin_status: undefined,
  };

  const baseProfProfile: BusinessProfile = {
    segment: "prof",
    city_tier: 1,
    employee_count: 8,
    num_sites: 1,
    has_valid_gstin: true,
    gstin_status: "Active",
  };

  const baseMultiProfile: BusinessProfile = {
    segment: "multi",
    city_tier: 1,
    employee_count: 35,
    num_sites: 5,
    has_valid_gstin: true,
    gstin_status: "Active",
  };

  const baseMfgProfile: BusinessProfile = {
    segment: "mfg",
    city_tier: 2,
    employee_count: 30,
    num_sites: 1,
    has_valid_gstin: true,
    gstin_status: "Active",
  };

  // ── 1. City Tier Checks ─────────────────────────────────────────────────────
  it("Case 1: Tier-2 business asking for P03 (Biz Fibre 1G) should be INELIGIBLE (Tier 1 only)", () => {
    const profile: BusinessProfile = {
      ...baseProfProfile,
      city_tier: 2,
    };
    const res = eligibility(profile, "P03");
    expect(res.eligible).toBe(false);
    expect(res.reasons.some((r) => r.includes("Tier 1"))).toBe(true);
  });

  it("Case 2: Tier-1 business asking for P03 with 5+ employees and Active GSTIN should be ELIGIBLE", () => {
    const profile: BusinessProfile = {
      ...baseProfProfile,
      city_tier: 1,
      employee_count: 6,
      has_valid_gstin: true,
      gstin_status: "Active",
    };
    const res = eligibility(profile, "P03");
    expect(res.eligible).toBe(true);
    expect(res.reasons.length).toBe(0);
  });

  // ── 2. GSTIN Requirement Checks ─────────────────────────────────────────────
  it("Case 3: No-GSTIN business asking for WhatsApp API (P15) should be INELIGIBLE", () => {
    const profile: BusinessProfile = {
      ...baseMicroProfile,
      has_valid_gstin: false,
    };
    const res = eligibility(profile, "P15");
    expect(res.eligible).toBe(false);
    expect(res.reasons.some((r) => r.toLowerCase().includes("gstin"))).toBe(true);
  });

  it("Case 4: Active GSTIN business asking for WhatsApp API (P15) should be ELIGIBLE", () => {
    const profile: BusinessProfile = {
      ...baseMicroProfile,
      has_valid_gstin: true,
      gstin_status: "Active",
    };
    const res = eligibility(profile, "P15");
    expect(res.eligible).toBe(true);
  });

  it("Case 5: Business with CANCELLED GSTIN asking for GST-required product (P05) should be INELIGIBLE", () => {
    const profile: BusinessProfile = {
      ...baseMfgProfile,
      has_valid_gstin: true,
      gstin_status: "Cancelled",
    };
    const res = eligibility(profile, "P05");
    expect(res.eligible).toBe(false);
    expect(res.reasons.some((r) => r.includes("Cancelled"))).toBe(true);
  });

  it("Case 6: Business with SUSPENDED GSTIN asking for GST-required product (P10) should be INELIGIBLE", () => {
    const profile: BusinessProfile = {
      ...baseMultiProfile,
      has_valid_gstin: true,
      gstin_status: "Suspended",
    };
    const res = eligibility(profile, "P10");
    expect(res.eligible).toBe(false);
    expect(res.reasons.some((r) => r.includes("Suspended"))).toBe(true);
  });

  // ── 3. Site and Employee Count Thresholds ───────────────────────────────────
  it("Case 7: SD-WAN (P10) with 2 sites should be INELIGIBLE (requires min 3 sites)", () => {
    const profile: BusinessProfile = {
      ...baseMultiProfile,
      num_sites: 2,
    };
    const res = eligibility(profile, "P10");
    expect(res.eligible).toBe(false);
    expect(res.reasons.some((r) => r.includes("3 site(s)"))).toBe(true);
  });

  it("Case 8: SD-WAN (P10) with 3 sites, 10 employees and Active GSTIN should be ELIGIBLE", () => {
    const profile: BusinessProfile = {
      ...baseMultiProfile,
      num_sites: 3,
      employee_count: 10,
    };
    const res = eligibility(profile, "P10");
    expect(res.eligible).toBe(true);
  });

  it("Case 9: Leased Line 100 (P06) with 20 employees should be INELIGIBLE (requires min 25)", () => {
    const profile: BusinessProfile = {
      ...baseMfgProfile,
      employee_count: 20,
    };
    const res = eligibility(profile, "P06");
    expect(res.eligible).toBe(false);
    expect(res.reasons.some((r) => r.includes("25 employees"))).toBe(true);
  });

  it("Case 10: Leased Line 100 (P06) with 25 employees and Active GSTIN should be ELIGIBLE", () => {
    const profile: BusinessProfile = {
      ...baseMfgProfile,
      employee_count: 25,
      has_valid_gstin: true,
      gstin_status: "Active",
    };
    const res = eligibility(profile, "P06");
    expect(res.eligible).toBe(true);
  });

  it("Case 11: Leased Line 20 (P05) with 9 employees should be INELIGIBLE (requires min 10)", () => {
    const profile: BusinessProfile = {
      ...baseMfgProfile,
      employee_count: 9,
    };
    const res = eligibility(profile, "P05");
    expect(res.eligible).toBe(false);
    expect(res.reasons.some((r) => r.includes("10 employees"))).toBe(true);
  });

  it("Case 12: Cloud Telephony (P12) with 2 employees should be INELIGIBLE (requires min 3)", () => {
    const profile: BusinessProfile = {
      ...baseProfProfile,
      employee_count: 2,
    };
    const res = eligibility(profile, "P12");
    expect(res.eligible).toBe(false);
    expect(res.reasons.some((r) => r.includes("3 employees"))).toBe(true);
  });

  it("Case 13: Machine Monitoring IoT (P24) with 5 employees should be INELIGIBLE (requires min 10)", () => {
    const profile: BusinessProfile = {
      ...baseMfgProfile,
      employee_count: 5,
    };
    const res = eligibility(profile, "P24");
    expect(res.eligible).toBe(false);
    expect(res.reasons.some((r) => r.includes("10 employees"))).toBe(true);
  });

  it("Case 14: Non-existent product ID returns ineligible with friendly error", () => {
    const res = eligibility(baseMicroProfile, "P999");
    expect(res.eligible).toBe(false);
    expect(res.reasons[0]).toContain("does not exist");
  });

  // ── 4. Dependency Validation (checkDependencies) ───────────────────────────
  it("Case 15: checkDependencies fails when P09 (Failover) is in bundle without connectivity", () => {
    const check = checkDependencies(["P09"]);
    expect(check.valid).toBe(false);
    expect(check.missingDependencies.length).toBe(1);
    expect(check.missingDependencies[0].productId).toBe("P09");
  });

  it("Case 16: checkDependencies passes when P09 (Failover) is bundled with P01 (Biz Fibre 100)", () => {
    const check = checkDependencies(["P01", "P09"]);
    expect(check.valid).toBe(true);
    expect(check.missingDependencies.length).toBe(0);
  });

  it("Case 17: checkDependencies passes when P11 (Static IP) is bundled with P02 (Biz Fibre 300)", () => {
    const check = checkDependencies(["P02", "P11"]);
    expect(check.valid).toBe(true);
  });

  it("Case 18: checkDependencies fails when P11 (Static IP) is bundled with P04 (AirFiber - not in P11 allowed deps)", () => {
    // P11 requires one of: P01 | P02 | P03
    const check = checkDependencies(["P04", "P11"]);
    expect(check.valid).toBe(false);
    expect(check.missingDependencies[0].productId).toBe("P11");
  });

  // ── 5. Auto-Add Connectivity in buildQuote ─────────────────────────────────
  it("Case 19: CCTV without internet (P23 alone) in buildQuote AUTO-ADDS connectivity and emits a warning", () => {
    const quote = buildQuote(baseMicroProfile, [{ productId: "P23", qty: 2 }]);
    // P23 requires P01|P02|P03|P04|P05|P06
    // Base micro profile should auto-receive P01 (Biz Fibre 100)
    const productIds = quote.lines.map((l) => l.productId);
    expect(productIds).toContain("P01");
    expect(productIds).toContain("P23");
    expect(quote.warnings.length).toBeGreaterThan(0);
    expect(quote.warnings[0]).toContain("Auto-added");
  });

  it("Case 20: CCTV with internet (P23 + P01) in buildQuote does NOT auto-add duplicate connectivity", () => {
    const quote = buildQuote(baseMicroProfile, [
      { productId: "P01", qty: 1 },
      { productId: "P23", qty: 1 },
    ]);
    const p01Lines = quote.lines.filter((l) => l.productId === "P01");
    expect(p01Lines.length).toBe(1);
    expect(quote.warnings.length).toBe(0);
  });

  // ── 6. Pricing Rules by Segment Sensitivity ────────────────────────────────
  it("Case 21: priceLine for MICRO segment prices at exact minimum end (0% markup)", () => {
    // P01: 999 to 1199 -> micro should be 999
    const p1 = priceLine("P01", 1, "micro");
    expect(p1.unitPrice).toBe(999);
    expect(p1.monthlyTotal).toBe(999);

    // P02: 1499 to 1799 -> micro should be 1499
    const p2 = priceLine("P02", 1, "micro");
    expect(p2.unitPrice).toBe(1499);
  });

  it("Case 22: priceLine for PROF segment prices at ~35% within [min, max]", () => {
    // P01: 999 to 1199 (range 200). 200 * 0.35 = 70 -> 999 + 70 = 1069
    const p1 = priceLine("P01", 1, "prof");
    expect(p1.unitPrice).toBe(1069);
  });

  it("Case 23: priceLine for MULTI segment prices at ~60% within [min, max]", () => {
    // P01: 999 to 1199 (range 200). 200 * 0.60 = 120 -> 999 + 120 = 1119
    const p1 = priceLine("P01", 1, "multi");
    expect(p1.unitPrice).toBe(1119);
  });

  it("Case 24: priceLine for MFG segment prices at ~70% within [min, max]", () => {
    // P01: 999 to 1199 (range 200). 200 * 0.70 = 140 -> 999 + 140 = 1139
    const p1 = priceLine("P01", 1, "mfg");
    expect(p1.unitPrice).toBe(1139);
  });

  it("Case 25: priceLine correctly calculates quantities and setup fees", () => {
    // P19 Cloud POS: price 599-899, setup fee 2500
    const line = priceLine("P19", 3, "micro");
    expect(line.qty).toBe(3);
    expect(line.monthlyTotal).toBe(599 * 3);
    expect(line.setupFee).toBe(2500 * 3);
  });

  // ── 7. Quote Aggregation & Contract Commitment ─────────────────────────────
  it("Case 26: buildQuote correctly removes ineligible products and populates removed_for_ineligibility", () => {
    const profile: BusinessProfile = {
      ...baseMicroProfile,
      city_tier: 2,
    };
    // Request P01 (eligible) and P03 (ineligible in tier 2)
    const quote = buildQuote(profile, [
      { productId: "P01", qty: 1 },
      { productId: "P03", qty: 1 },
    ]);
    expect(quote.lines.some((l) => l.productId === "P01")).toBe(true);
    expect(quote.lines.some((l) => l.productId === "P03")).toBe(false);
    expect(quote.removed_for_ineligibility.some((r) => r.productId === "P03")).toBe(true);
  });

  it("Case 27: buildQuote correctly calculates 18% GST and grand monthly total", () => {
    const quote = buildQuote(baseMicroProfile, [{ productId: "P01", qty: 1 }]);
    // P01 micro monthly = 999
    expect(quote.monthly_total).toBe(999);
    expect(quote.gst_18pct).toBe(Math.round(999 * 0.18)); // 180
    expect(quote.grand_monthly_total).toBe(999 + Math.round(999 * 0.18)); // 1179
  });

  it("Case 28: buildQuote selects 24-month contract if SD-WAN (P10) or Firewall (P21) is selected", () => {
    const quote = buildQuote(baseMultiProfile, [
      { productId: "P02", qty: 3 },
      { productId: "P10", qty: 3 }, // P10 has min_contract_months: 24
    ]);
    expect(quote.contract_months).toBe(24);
  });

  // ── 8. Segment Default Bundles ─────────────────────────────────────────────
  it("Case 29: getDefaultBundle for micro generates starter pack without requiring GSTIN", () => {
    const quote = getDefaultBundle(baseMicroProfile);
    expect(quote.lines.length).toBeGreaterThanOrEqual(3);
    expect(quote.removed_for_ineligibility.length).toBe(0);
    expect(quote.grand_monthly_total).toBeGreaterThan(0);
  });

  it("Case 30: getDefaultBundle for multi dynamically scales quantities to num_sites", () => {
    const profile: BusinessProfile = {
      ...baseMultiProfile,
      num_sites: 4,
    };
    const quote = getDefaultBundle(profile);
    const p02Line = quote.lines.find((l) => l.productId === "P02");
    expect(p02Line?.qty).toBe(4);
  });
});
