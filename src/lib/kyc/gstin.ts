/**
 * GSTIN format validation, checksum verification, and privacy masking.
 *
 * A valid GSTIN is 15 characters:
 *   Chars 1-2:  State code (01–38, numeric per Indian GST jurisdiction)
 *   Chars 3-12: PAN (5 alpha + 4 numeric + 1 alpha; 4th char of PAN allows 'X' for this dataset)
 *   Char 13:    Entity number (1-9 or A-Z)
 *   Char 14:    'Z' (default)
 *   Char 15:    Checksum (alphanumeric mod-36, computed from chars 1-14)
 */

// ---------------------------------------------------------------------------
// Character ↔ numeric mapping for Mod-36 Checksum
// ---------------------------------------------------------------------------

const CHAR_MAP: Record<string, number> = {};
for (let i = 0; i <= 9; i++) CHAR_MAP[String(i)] = i;
for (let i = 0; i < 26; i++) CHAR_MAP[String.fromCharCode(65 + i)] = 10 + i;

const NUM_TO_CHAR: string[] = [];
for (let i = 0; i <= 9; i++) NUM_TO_CHAR.push(String(i));
for (let i = 0; i < 26; i++) NUM_TO_CHAR.push(String.fromCharCode(65 + i));

/**
 * Compute the expected mod-36 checksum character for the first 14 characters of a GSTIN.
 */
export function computeGSTINChecksum(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const mapped = CHAR_MAP[first14[i]];
    if (mapped === undefined) return "";
    const factor = i % 2 === 0 ? 1 : 2;
    const product = mapped * factor;
    const quotient = Math.floor(product / 36) + (product % 36);
    sum += quotient;
  }
  const remainder = sum % 36;
  const checkDigit = (36 - remainder) % 36;
  return NUM_TO_CHAR[checkDigit];
}

// ---------------------------------------------------------------------------
// OCR Ambiguity Reconciliation (strictly O/0 and I/1 confusions)
// ---------------------------------------------------------------------------

/**
 * Reconcile common OCR visual ambiguities strictly limited to O/0 and I/1 confusions
 * according to standard GSTIN slot rules:
 * - Slots 0-1 (State): digits ('O' -> '0')
 * - Slots 2-6 (PAN alpha prefix): letters ('0' -> 'O', '1' -> 'I')
 * - Slots 7-10 (PAN digits): digits ('O' -> '0', 'I' -> '1', 'l' -> '1')
 * - Slot 11 (PAN alpha suffix): letter ('0' -> 'O', '1' -> 'I')
 * - Slot 13 (Constant): 'Z' ('2' -> 'Z')
 * - Slot 14 (Check digit): if expected checksum is 'O' and OCR read '0', or expected '0' and OCR read 'O',
 *                          or expected 'I' and OCR read '1', or expected '1' and OCR read 'I'.
 */
export function reconcileOCRGstin(rawGstin: string, knownRegistry?: Set<string>): string {
  if (!rawGstin) return rawGstin;
  const upper = rawGstin.toUpperCase().trim();
  if (upper.length !== 15) return upper;

  // If already passes checksum or matches known registry, return as is
  if (validateGSTINChecksum(upper) || (knownRegistry && knownRegistry.has(upper))) {
    return upper;
  }

  // Attempt slot-specific character replacements (digits vs letters for O/0 and I/1)
  const chars = upper.split("");
  // Chars 0-1 are numeric state code: 'O' -> '0'
  if (chars[0] === "O") chars[0] = "0";
  if (chars[1] === "O") chars[1] = "0";

  // Chars 2-6 are alpha: '0' -> 'O', '1' -> 'I'
  for (let i = 2; i <= 6; i++) {
    if (chars[i] === "0") chars[i] = "O";
    if (chars[i] === "1") chars[i] = "I";
  }

  // Chars 7-10 are numeric: 'O' -> '0', 'I' -> '1', 'l' -> '1'
  for (let i = 7; i <= 10; i++) {
    if (chars[i] === "O") chars[i] = "0";
    if (chars[i] === "I" || chars[i] === "L") chars[i] = "1";
  }

  // Char 11 is alpha: '0' -> 'O', '1' -> 'I'
  if (chars[11] === "0") chars[11] = "O";
  if (chars[11] === "1") chars[11] = "I";

  // Char 13 is 'Z': '2' -> 'Z'
  if (chars[13] === "2") chars[13] = "Z";

  const candidate14 = chars.slice(0, 14).join("");
  const expectedCheck = computeGSTINChecksum(candidate14);

  // If matches existing check character
  if (expectedCheck !== "" && chars[14] === expectedCheck) {
    return candidate14 + chars[14];
  }

  // Reconcile 15th character if it was confused between O/0 or I/1
  if (
    (chars[14] === "0" && expectedCheck === "O") ||
    (chars[14] === "O" && expectedCheck === "0") ||
    (chars[14] === "1" && expectedCheck === "I") ||
    (chars[14] === "I" && expectedCheck === "1")
  ) {
    return candidate14 + expectedCheck;
  }

  const candidate = chars.join("");
  if (validateGSTINChecksum(candidate) || (knownRegistry && knownRegistry.has(candidate))) {
    return candidate;
  }

  return upper;
}

/**
 * Validates the 15th character checksum of a GSTIN using the official Mod-36 algorithm.
 */
export function validateGSTINChecksum(gstin: string): boolean {
  if (typeof gstin !== "string" || gstin.length !== 15) return false;
  const upper = gstin.toUpperCase().trim();
  const expected = computeGSTINChecksum(upper.slice(0, 14));
  return expected !== "" && upper[14] === expected;
}

// ---------------------------------------------------------------------------
// Valid State Codes (01 to 38)
// ---------------------------------------------------------------------------

export const VALID_STATE_CODES = new Set<string>(
  Array.from({ length: 38 }, (_, i) => String(i + 1).padStart(2, "0")),
);

/**
 * Validate the overall format, state code, PAN structure (allowing 'X' as 4th char),
 * and checksum of a GSTIN string.
 */
export function validateGSTINFormat(gstin: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof gstin !== "string" || gstin.trim().length === 0) {
    return { valid: false, errors: ["GSTIN must be a non-empty string"] };
  }

  const upper = gstin.toUpperCase().trim();

  // 1. Length check
  if (upper.length !== 15) {
    errors.push(`GSTIN must be exactly 15 characters, got ${upper.length}`);
    return { valid: false, errors };
  }

  // 2. Alphanumeric check
  if (!/^[A-Z0-9]{15}$/.test(upper)) {
    errors.push("GSTIN must contain only alphanumeric characters (A-Z, 0-9)");
    return { valid: false, errors };
  }

  // 3. State code (chars 1-2 must be 01-38)
  const stateCode = upper.slice(0, 2);
  if (!VALID_STATE_CODES.has(stateCode)) {
    errors.push(`Invalid state code "${stateCode}". Must be between 01 and 38.`);
  }

  // 4. Embedded PAN pattern (chars 3-12)
  // Standard PAN: [A-Z]{3}[A-Z][A-Z][0-9]{4}[A-Z]
  // Per case study instructions: 4th char is allowed to be 'X'
  const pan = upper.slice(2, 12);
  const panRegex = /^[A-Z]{3}[A-ZX][A-Z][0-9]{4}[A-Z]$/;
  if (!panRegex.test(pan)) {
    errors.push(`Invalid embedded PAN structure "${pan}". Must be 5 letters + 4 digits + 1 letter (with X allowed).`);
  }

  // 5. Default 14th character must be 'Z'
  if (upper[13] !== "Z") {
    errors.push(`14th character must be 'Z', got "${upper[13]}"`);
  }

  // 6. Checksum check (15th char)
  if (!validateGSTINChecksum(upper)) {
    const expected = computeGSTINChecksum(upper.slice(0, 14));
    errors.push(`Checksum mismatch: expected "${expected}", got "${upper[14]}"`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Mask sensitive identifiers (GSTIN, PAN, Udyam, Aadhaar) for DPDP Act 2023 compliance.
 * Shows only the first 2 and last 3 characters (e.g. "03*****1ZB").
 */
export function maskIdentifier(id: string | null | undefined): string {
  if (!id) return "*****";
  const clean = id.trim();
  if (clean.length <= 5) return "*****";
  const start = clean.slice(0, 2);
  const end = clean.slice(-3);
  const maskedCount = Math.max(3, clean.length - 5);
  return `${start}${"*".repeat(maskedCount)}${end}`;
}
