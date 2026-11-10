import prisma from "../prisma";
import { eligibility, buildQuote, findProduct, DEFAULT_CATALOGUE } from "../rules";
import type { BusinessProfile, QuoteLineInput, QuoteResult } from "../rules/types";
import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

/**
 * Tool 1: Lookup GSTIN in the mock GST registry
 */
export async function executeLookupGstin(gstin: string) {
  if (!gstin || gstin.trim().length === 0) {
    return { found: false, error: "Empty GSTIN provided" };
  }

  const cleanGstin = gstin.trim().toUpperCase();
  try {
    const record = await prisma.gstinRecord.findUnique({
      where: { gstin: cleanGstin },
    });

    if (!record) {
      return {
        found: false,
        gstin: cleanGstin,
        message: "GSTIN not found in mock GST registry.",
      };
    }

    return {
      found: true,
      gstin: record.gstin,
      legalName: record.legalName,
      tradeName: record.tradeName,
      status: record.status, // Active, Cancelled, Suspended
      state: record.state,
      principalPlaceOfBusiness: record.principalPlaceOfBusiness,
      registrationDate: record.registrationDate,
    };
  } catch (error) {
    console.error("lookup_gstin database error:", error);
    return { found: false, error: "Failed to query GSTIN registry." };
  }
}

/**
 * Tool 2: Check Eligibility for a list of products
 */
export function executeCheckEligibility(
  profile: BusinessProfile,
  productIds: string[],
) {
  const results = productIds.map((id) => {
    const prod = findProduct(id, DEFAULT_CATALOGUE);
    const result = eligibility(profile, id, DEFAULT_CATALOGUE);
    return {
      productId: id,
      productName: prod?.product_name || id,
      eligible: result.eligible,
      reasons: result.reasons,
    };
  });

  return { results };
}

/**
 * Tool 3: Build Quote and check dependencies
 */
export function executeBuildQuote(
  profile: BusinessProfile,
  lines: QuoteLineInput[],
): QuoteResult {
  return buildQuote(profile, lines, DEFAULT_CATALOGUE);
}

/**
 * Gemini Tool Declarations for Function Calling
 */
export const advisorTools: FunctionDeclaration[] = [
  {
    name: "lookup_gstin",
    description: "Look up a business's 15-character GSTIN in the national registry to verify active status and registered legal name.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        gstin: {
          type: SchemaType.STRING,
          description: "15-character GSTIN identifier, e.g. '03PJNXS4821G1ZB'.",
        },
      },
      required: ["gstin"],
    },
  },
  {
    name: "check_eligibility",
    description: "Check if the business profile satisfies city tier, employee count, site count, and active GST requirements for products.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        profile: {
          type: SchemaType.OBJECT,
          description: "Business profile details.",
          properties: {
            segment: { type: SchemaType.STRING, description: "'micro' | 'prof' | 'multi' | 'mfg'" },
            city_tier: { type: SchemaType.NUMBER, description: "1 (metro) or 2 (smaller city)" },
            employee_count: { type: SchemaType.NUMBER, description: "Total employees" },
            num_sites: { type: SchemaType.NUMBER, description: "Number of physical offices/stores" },
            has_valid_gstin: { type: SchemaType.BOOLEAN, description: "True if business has a valid GSTIN" },
            gstin_status: { type: SchemaType.STRING, description: "e.g. 'Active', 'Cancelled', 'Suspended'" },
          },
          required: ["segment", "city_tier", "employee_count", "num_sites", "has_valid_gstin"],
        },
        productIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Array of product IDs like ['P01', 'P07', 'P19'].",
        },
      },
      required: ["profile", "productIds"],
    },
  },
  {
    name: "build_quote",
    description: "Calculate official, deterministic monthly pricing, one-time fees, GST, and contract duration for a product bundle. Automatically resolves missing dependencies.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        profile: {
          type: SchemaType.OBJECT,
          description: "Business profile details.",
          properties: {
            segment: { type: SchemaType.STRING, description: "'micro' | 'prof' | 'multi' | 'mfg'" },
            city_tier: { type: SchemaType.NUMBER, description: "1 or 2" },
            employee_count: { type: SchemaType.NUMBER, description: "Total employees" },
            num_sites: { type: SchemaType.NUMBER, description: "Number of sites" },
            has_valid_gstin: { type: SchemaType.BOOLEAN },
            gstin_status: { type: SchemaType.STRING },
          },
          required: ["segment", "city_tier", "employee_count", "num_sites", "has_valid_gstin"],
        },
        lines: {
          type: SchemaType.ARRAY,
          description: "List of products and quantities to include in the quote.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              productId: { type: SchemaType.STRING, description: "e.g. 'P01', 'P02', 'P19'" },
              qty: { type: SchemaType.NUMBER, description: "Quantity of units" },
            },
            required: ["productId"],
          },
        },
      },
      required: ["profile", "lines"],
    },
  },
];
