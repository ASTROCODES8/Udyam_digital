/**
 * eligibility.ts — Deterministic eligibility and dependency rules engine
 * for Accel Business / Airtel SYNC.
 */

import type {
  BusinessProfile,
  Product,
  EligibilityResult,
  DependencyCheckResult,
} from "./types";
import { DEFAULT_CATALOGUE, findProduct } from "./catalogue";

/**
 * 1) eligibility(profile, productId) -> { eligible: boolean, reasons: string[] }
 * Checks city tier, min employees, min sites, and active GSTIN requirements.
 */
export function eligibility(
  profile: BusinessProfile,
  productId: string,
  catalogue: Product[] = DEFAULT_CATALOGUE,
): EligibilityResult {
  const product = findProduct(productId, catalogue);
  if (!product) {
    return {
      eligible: false,
      reasons: [`Product code "${productId}" does not exist in the product catalogue.`],
    };
  }

  const reasons: string[] = [];

  // 1. City Tier availability
  if (!product.available_city_tiers.includes(profile.city_tier)) {
    reasons.push(
      `${product.product_name} (${product.product_id}) is only available in Tier ${product.available_city_tiers.join(
        ", ",
      )} cities. Your business location is Tier ${profile.city_tier}.`,
    );
  }

  // 2. Minimum employees
  if (profile.employee_count < product.min_employees) {
    reasons.push(
      `${product.product_name} requires a minimum of ${product.min_employees} employees. Your business has ${profile.employee_count}.`,
    );
  }

  // 3. Minimum sites
  if (profile.num_sites < product.min_sites) {
    reasons.push(
      `${product.product_name} requires at least ${product.min_sites} site(s). Your business operates ${profile.num_sites}.`,
    );
  }

  // 4. Requires GSTIN (Must be provided AND Active)
  if (product.requires_gstin) {
    const isGstinActive =
      profile.has_valid_gstin &&
      (!profile.gstin_status || profile.gstin_status.trim().toLowerCase() === "active");

    if (!profile.has_valid_gstin) {
      if (product.product_id === "P03") {
        reasons.push(
          `${product.product_name} requires a valid, active GSTIN. You can select Biz Fibre 100 (P01) or Biz Fibre 300 (P02) without a GSTIN.`,
        );
      } else if (product.product_id === "P15") {
        reasons.push(
          `WhatsApp Business API (${product.product_id}) requires an active GSTIN for Meta business verification.`,
        );
      } else {
        reasons.push(
          `${product.product_name} requires an active GSTIN registration. No valid GSTIN was provided.`,
        );
      }
    } else if (!isGstinActive) {
      reasons.push(
        `${product.product_name} requires an ACTIVE GSTIN. Your GSTIN registration status is "${profile.gstin_status}".`,
      );
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

/**
 * 2) checkDependencies(bundle) -> { valid: boolean, missingDependencies: [...], reasons: string[] }
 * Validates requires_one_of rules across all items in a bundle.
 */
export function checkDependencies(
  bundle: (string | { productId: string })[],
  catalogue: Product[] = DEFAULT_CATALOGUE,
): DependencyCheckResult {
  const bundleProductIds = bundle.map((item) =>
    typeof item === "string" ? item.toUpperCase() : item.productId.toUpperCase(),
  );

  const missingDependencies: {
    productId: string;
    productName: string;
    requiresOneOf: string[];
  }[] = [];

  const reasons: string[] = [];

  for (const pid of bundleProductIds) {
    const product = findProduct(pid, catalogue);
    if (!product) continue;

    if (product.requires_one_of && product.requires_one_of.length > 0) {
      const hasDependency = product.requires_one_of.some((depId) =>
        bundleProductIds.includes(depId.toUpperCase()),
      );

      if (!hasDependency) {
        missingDependencies.push({
          productId: product.product_id,
          productName: product.product_name,
          requiresOneOf: product.requires_one_of,
        });

        const depNames = product.requires_one_of
          .map((id) => {
            const p = findProduct(id, catalogue);
            return p ? `${p.product_name} (${id})` : id;
          })
          .join(" OR ");

        reasons.push(
          `${product.product_name} (${product.product_id}) requires at least one base connectivity link: ${depNames}.`,
        );
      }
    }
  }

  return {
    valid: missingDependencies.length === 0,
    missingDependencies,
    reasons,
  };
}

// Aliases for compatibility
export const checkEligibility = (
  product: Product,
  profile: BusinessProfile,
): EligibilityResult => {
  return eligibility(profile, product.product_id);
};

export function getEligibleProducts(
  products: Product[],
  profile: BusinessProfile,
): {
  eligible: Product[];
  ineligible: { product: Product; reasons: string[] }[];
} {
  const eligible: Product[] = [];
  const ineligible: { product: Product; reasons: string[] }[] = [];

  for (const product of products) {
    const result = eligibility(profile, product.product_id, products);
    if (result.eligible) {
      eligible.push(product);
    } else {
      ineligible.push({ product, reasons: result.reasons });
    }
  }

  return { eligible, ineligible };
}
