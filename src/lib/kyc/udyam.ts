/**
 * Udyam registration number format validation.
 *
 * Format: UDYAM-XX-00-NNNNNNN
 *   - UDYAM   — fixed prefix
 *   - XX      — 2-letter state code (e.g. KL, MH, TN)
 *   - 00      — district code (always "00" in this dataset)
 *   - NNNNNNN — 7-digit serial number
 */

// ---------------------------------------------------------------------------
// Valid 2-letter Indian state / UT codes used in Udyam registrations
// ---------------------------------------------------------------------------

const VALID_STATE_CODES = new Set<string>([
  'AN', // Andaman & Nicobar
  'AP', // Andhra Pradesh
  'AR', // Arunachal Pradesh
  'AS', // Assam
  'BR', // Bihar
  'CH', // Chandigarh
  'CT', // Chhattisgarh
  'DD', // Daman & Diu / Dadra & Nagar Haveli
  'DL', // Delhi
  'GA', // Goa
  'GJ', // Gujarat
  'HP', // Himachal Pradesh
  'HR', // Haryana
  'JH', // Jharkhand
  'JK', // Jammu & Kashmir
  'KA', // Karnataka
  'KL', // Kerala
  'LA', // Ladakh
  'LD', // Lakshadweep
  'MH', // Maharashtra
  'ML', // Meghalaya
  'MN', // Manipur
  'MP', // Madhya Pradesh
  'MZ', // Mizoram
  'NL', // Nagaland
  'OR', // Odisha
  'PB', // Punjab
  'PY', // Puducherry
  'RJ', // Rajasthan
  'SK', // Sikkim
  'TN', // Tamil Nadu
  'TR', // Tripura
  'TS', // Telangana
  'UK', // Uttarakhand
  'UP', // Uttar Pradesh
  'WB', // West Bengal
]);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate the format of an Udyam registration number.
 *
 * Returns `{ valid: true, errors: [] }` on success, or
 * `{ valid: false, errors: [...] }` with human-readable messages on failure.
 */
export function validateUdyamFormat(udyam: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof udyam !== 'string' || udyam.length === 0) {
    return { valid: false, errors: ['Udyam number must be a non-empty string'] };
  }

  const trimmed = udyam.trim().toUpperCase();

  // Overall pattern: UDYAM-XX-00-NNNNNNN
  const pattern = /^UDYAM-([A-Z]{2})-(\d{2})-(\d{7})$/;
  const match = trimmed.match(pattern);

  if (!match) {
    errors.push(
      `Udyam number must match the pattern UDYAM-XX-00-NNNNNNN, got "${trimmed}"`,
    );
    return { valid: false, errors };
  }

  const [, stateCode, districtCode, serialNumber] = match;

  // State code
  if (!VALID_STATE_CODES.has(stateCode)) {
    errors.push(
      `State code "${stateCode}" is not a recognised Indian state/UT code`,
    );
  }

  // District code — accept "00" for this dataset
  if (districtCode !== '00') {
    errors.push(
      `District code must be "00" in this dataset, got "${districtCode}"`,
    );
  }

  // Serial number — must not be all zeros
  if (/^0{7}$/.test(serialNumber)) {
    errors.push('Serial number must not be all zeros');
  }

  return { valid: errors.length === 0, errors };
}
