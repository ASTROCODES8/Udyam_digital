/**
 * bundles.ts — Segment bundle templates, dependency resolution,
 * and quote generation for Accel Business / Airtel SYNC.
 */

import type {
  BusinessProfile,
  Product,
  QuoteLineInput,
  QuoteResult,
  PriceLineResult,
  Segment,
} from "./types";
import { DEFAULT_CATALOGUE, findProduct } from "./catalogue";
import { eligibility, checkDependencies } from "./eligibility";
import { priceLine } from "./pricing";

/**
 * Segment-default starter bundle templates
 * Expressed as product ID + quantity calculation rule.
 */
export interface BundleTemplateItem {
  productId: string;
  qtyRule: number | "num_sites" | "employee_count";
}

export interface SegmentBundleTemplate {
  name: string;
  tagline: string;
  items: BundleTemplateItem[];
}

export const SEGMENT_TEMPLATES: Record<string, SegmentBundleTemplate> = {
  micro: {
    name: "Micro Digital Starter Pack",
    tagline: "Essential fibre broadband, mobile lines, POS billing and business website for single-site retail & services.",
    items: [
      { productId: "P01", qtyRule: 1 },           // Biz Fibre 100
      { productId: "P07", qtyRule: 2 },           // 2x Business Postpaid 299
      { productId: "P19", qtyRule: 1 },           // Cloud POS & Billing
      { productId: "P18", qtyRule: 1 },           // Website + Domain Starter
    ],
  },
  prof: {
    name: "Professional Practice Pack",
    tagline: "High-speed broadband, business email, IVR cloud telephony and secure Wi-Fi for clinics, CA firms & offices.",
    items: [
      { productId: "P02", qtyRule: 1 },           // Biz Fibre 300
      { productId: "P07", qtyRule: 3 },           // 3x Business Postpaid 299
      { productId: "P12", qtyRule: 1 },           // Cloud Telephony / SIP (IVR)
      { productId: "P16", qtyRule: 5 },           // 5x Cloud Email & Office Suite
      { productId: "P22", qtyRule: 1 },           // Secure Wi-Fi with Guest Network
    ],
  },
  multi: {
    name: "Multi-Site Retail & Branch Pack",
    tagline: "SD-WAN managed connectivity, automatic 4G failover, multi-site Wi-Fi and CCTV for retail chains & branches.",
    items: [
      { productId: "P02", qtyRule: "num_sites" }, // Biz Fibre 300 per site
      { productId: "P09", qtyRule: "num_sites" }, // Automatic Failover per site
      { productId: "P10", qtyRule: "num_sites" }, // Managed SD-WAN per site
      { productId: "P22", qtyRule: "num_sites" }, // Secure Wi-Fi per site
      { productId: "P08", qtyRule: 5 },           // 5x Postpaid 599 with roaming
    ],
  },
  mfg: {
    name: "Connected Factory & Operations Pack",
    tagline: "SLA-backed Leased Line, 4G failover, IoT machine sensors, fleet tracking and next-gen managed firewall.",
    items: [
      { productId: "P05", qtyRule: 1 },           // Internet Leased Line 20 (99.5% SLA)
      { productId: "P09", qtyRule: 1 },           // 4G/5G Failover
      { productId: "P21", qtyRule: 1 },           // Managed Firewall
      { productId: "P24", qtyRule: 5 },           // 5x Machine Monitoring IoT
      { productId: "P25", qtyRule: 2 },           // 2x Fleet GPS Tracker
      { productId: "P20", qtyRule: 10 },          // 10x Endpoint Security
    ],
  },
};

/**
 * 3) buildQuote(profile, lines[]) -> QuoteResult
 * 
 * - Evaluates eligibility for each line; removes ineligible products with reasons.
 * - Checks dependency rules; if a dependent product is present without its required
 *   connectivity link, AUTO-ADDS the best eligible connectivity product and notes it in warnings.
 * - Computes pricing with segment sensitivity.
 * - Computes totals, 18% GST, and contract commitment.
 */
export function buildQuote(
  profile: BusinessProfile,
  requestedLines: QuoteLineInput[],
  catalogue: Product[] = DEFAULT_CATALOGUE,
): QuoteResult {
  const warnings: string[] = [];
  const removed_for_ineligibility: {
    productId: string;
    productName?: string;
    reasons: string[];
  }[] = [];

  // 1. Initial Eligibility Filtering
  const eligibleInputs: { productId: string; qty: number }[] = [];

  for (const item of requestedLines) {
    const product = findProduct(item.productId, catalogue);
    if (!product) {
      removed_for_ineligibility.push({
        productId: item.productId,
        reasons: [`Product code "${item.productId}" not found.`],
      });
      continue;
    }

    const elig = eligibility(profile, item.productId, catalogue);
    if (!elig.eligible) {
      removed_for_ineligibility.push({
        productId: product.product_id,
        productName: product.product_name,
        reasons: elig.reasons,
      });
    } else {
      eligibleInputs.push({
        productId: product.product_id,
        qty: Math.max(1, item.qty ?? 1),
      });
    }
  }

  // 2. Dependency Check & Auto-Add Connectivity
  // If dependent products exist (e.g. CCTV, Failover, SD-WAN, Cloud Telephony)
  // but no compatible connectivity link is present, auto-add a compatible connectivity product!
  const depCheck = checkDependencies(eligibleInputs, catalogue);

  if (!depCheck.valid && depCheck.missingDependencies.length > 0) {
    for (const missing of depCheck.missingDependencies) {
      // Re-verify if dependency was satisfied by a previous auto-addition in this loop
      const currentIds = eligibleInputs.map((e) => e.productId.toUpperCase());
      const alreadySatisfied = missing.requiresOneOf.some((dep) =>
        currentIds.includes(dep.toUpperCase()),
      );
      if (alreadySatisfied) continue;

      // Select the best eligible connectivity fallback from requires_one_of
      // Preferred fallback hierarchy: P01 (Biz Fibre 100) -> P04 (5G AirFiber) -> P02 (Biz Fibre 300) -> first eligible
      const candidates = ["P01", "P04", "P02", ...missing.requiresOneOf];
      let selectedDep: Product | null = null;

      for (const candId of candidates) {
        if (!missing.requiresOneOf.includes(candId)) continue;
        const candProd = findProduct(candId, catalogue);
        if (candProd && eligibility(profile, candId, catalogue).eligible) {
          selectedDep = candProd;
          break;
        }
      }

      if (selectedDep) {
        eligibleInputs.unshift({
          productId: selectedDep.product_id,
          qty: 1,
        });

        warnings.push(
          `Auto-added ${selectedDep.product_name} (${selectedDep.product_id}) as the base connectivity link required by ${missing.productName} (${missing.productId}).`,
        );
      } else {
        warnings.push(
          `Warning: ${missing.productName} (${missing.productId}) requires connectivity (${missing.requiresOneOf.join(
            " / ",
          )}), but no qualifying link could be auto-added.`,
        );
      }
    }
  }

  // 3. Price Each Line Item
  const pricedLines: PriceLineResult[] = eligibleInputs.map((item) =>
    priceLine(item.productId, item.qty, profile.segment, catalogue),
  );

  // 4. Aggregations
  const monthly_total = pricedLines.reduce((acc, line) => acc + line.monthlyTotal, 0);
  const one_time_total = pricedLines.reduce((acc, line) => acc + line.setupFee, 0);

  // Determine contract commitment: maximum of min_contract_months across selected products (default 12)
  let maxContract = 12;
  for (const line of pricedLines) {
    const p = findProduct(line.productId, catalogue);
    if (p && p.min_contract_months > maxContract) {
      maxContract = p.min_contract_months;
    }
  }

  const gst_18pct = Math.round(monthly_total * 0.18);
  const grand_monthly_total = monthly_total + gst_18pct;

  return {
    lines: pricedLines,
    monthly_total,
    one_time_total,
    contract_months: maxContract,
    gst_18pct,
    grand_monthly_total,
    warnings,
    removed_for_ineligibility,
  };
}

/**
 * 4) getDefaultBundle(profile) -> QuoteResult
 * Generates the recommended starter bundle for the customer's segment,
 * dynamically resolved for their sites/employees and filtered by eligibility.
 */
export function getDefaultBundle(
  profile: BusinessProfile,
  catalogue: Product[] = DEFAULT_CATALOGUE,
): QuoteResult {
  const segKey = (profile.segment?.toLowerCase() || "micro") as Segment;
  const template = SEGMENT_TEMPLATES[segKey] || SEGMENT_TEMPLATES.micro;

  const rawLines: QuoteLineInput[] = template.items.map((item) => {
    let quantity = 1;
    if (item.qtyRule === "num_sites") {
      quantity = Math.max(1, profile.num_sites || 1);
    } else if (item.qtyRule === "employee_count") {
      quantity = Math.max(1, profile.employee_count || 1);
    } else {
      quantity = item.qtyRule;
    }
    return {
      productId: item.productId,
      qty: quantity,
    };
  });

  return buildQuote(profile, rawLines, catalogue);
}
