/**
 * types.ts — Core type definitions for the Accel Business / Airtel SYNC rules engine.
 */

export type Segment = "micro" | "prof" | "multi" | "mfg" | string;
export type CityTier = 1 | 2 | number;

/**
 * A single product from product_catalogue.csv
 */
export interface Product {
  product_id: string; // P01 .. P25
  category: string;
  product_name: string;
  description: string;
  unit: string;
  price_min_inr_per_month: number;
  price_max_inr_per_month: number;
  one_time_setup_inr: number;
  min_contract_months: number;
  available_city_tiers: number[];
  min_employees: number;
  min_sites: number;
  requires_gstin: boolean;
  requires_one_of: string[];
  typical_install_days: number;
  target_segments: string[];
}

/**
 * Business profile collected during discovery / advisor interview
 */
export interface BusinessProfile {
  segment: Segment;
  city_tier: CityTier;
  employee_count: number;
  num_sites: number;
  has_valid_gstin: boolean;
  gstin_status?: string; // "Active", "Cancelled", "Suspended"
  current_internet?: string;
  monthly_telecom_spend_inr?: number;
  products_of_interest?: string[];
  preferred_language?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export interface DependencyCheckResult {
  valid: boolean;
  missingDependencies: {
    productId: string;
    productName: string;
    requiresOneOf: string[];
  }[];
  reasons: string[];
}

export interface PriceLineResult {
  productId: string;
  productName: string;
  unitPrice: number;
  qty: number;
  monthlyTotal: number;
  setupFee: number;
  unit: string;
}

export interface QuoteLineInput {
  productId: string;
  qty?: number;
}

export interface QuoteResult {
  lines: PriceLineResult[];
  monthly_total: number;
  one_time_total: number;
  contract_months: number;
  gst_18pct: number;
  grand_monthly_total: number;
  warnings: string[];
  removed_for_ineligibility: {
    productId: string;
    productName?: string;
    reasons: string[];
  }[];
}
