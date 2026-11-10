/**
 * index.ts — Public API for the Accel Business / Airtel SYNC rules engine.
 */

// Types
export * from "./types";

// Catalogue
export { DEFAULT_CATALOGUE, findProduct } from "./catalogue";

// Eligibility
export {
  eligibility,
  checkDependencies,
  checkEligibility,
  getEligibleProducts,
} from "./eligibility";

// Pricing
export {
  priceLine,
  calculatePrice,
  SEGMENT_SENSITIVITY,
} from "./pricing";

// Bundles & Quotes
export {
  buildQuote,
  getDefaultBundle,
  SEGMENT_TEMPLATES,
} from "./bundles";
