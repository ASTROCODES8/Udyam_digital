/**
 * pricing.ts — Deterministic pricing engine for Accel Business products.
 *
 * Implements segment-specific price sensitivity bands within [price_min, price_max]:
 *   • micro  → min end (0% markup, purest low-cost entry)
 *   • prof   → ~35% between price_min and price_max
 *   • multi  → ~60% between price_min and price_max
 *   • mfg    → ~70% between price_min and price_max
 */

import type { Product, PriceLineResult } from "./types";
import { DEFAULT_CATALOGUE, findProduct } from "./catalogue";

/**
 * Segment sensitivity multipliers within [price_min, price_max]
 */
export const SEGMENT_SENSITIVITY: Record<string, number> = {
  micro: 0.0,  // minimum end
  prof: 0.35,  // 35%
  multi: 0.60, // 60%
  mfg: 0.70,   // 70%
};

/**
 * 2) priceLine(product, qty, segment) -> PriceLineResult
 * Returns unit price, qty, monthly total, setup fee within [price_min, price_max].
 */
export function priceLine(
  productOrId: Product | string,
  qty: number = 1,
  segment: string = "micro",
  catalogue: Product[] = DEFAULT_CATALOGUE,
): PriceLineResult {
  const product: Product | undefined =
    typeof productOrId === "string" ? findProduct(productOrId, catalogue) : productOrId;

  if (!product) {
    throw new Error(`Product not found for pricing: ${typeof productOrId === "string" ? productOrId : "unknown"}`);
  }

  const safeQty = Math.max(1, qty || 1);
  const normalizedSeg = segment?.toLowerCase() || "micro";
  const factor = SEGMENT_SENSITIVITY[normalizedSeg] ?? 0.0;

  // Calculate unit price based on segment sensitivity
  const range = product.price_max_inr_per_month - product.price_min_inr_per_month;
  let unitPrice = Math.round(product.price_min_inr_per_month + range * factor);

  // Guarantee unit price stays strictly within [price_min, price_max]
  unitPrice = Math.max(
    product.price_min_inr_per_month,
    Math.min(product.price_max_inr_per_month, unitPrice),
  );

  const monthlyTotal = unitPrice * safeQty;
  const setupFee = (product.one_time_setup_inr || 0) * safeQty;

  return {
    productId: product.product_id,
    productName: product.product_name,
    unitPrice,
    qty: safeQty,
    monthlyTotal,
    setupFee,
    unit: product.unit,
  };
}

/**
 * Legacy wrapper for compatibility
 */
export function calculatePrice(
  product: Product,
  profile: { segment: string },
  quantity: number,
): { monthly: number; setup: number } {
  const line = priceLine(product, quantity, profile.segment);
  return { monthly: line.monthlyTotal, setup: line.setupFee };
}
