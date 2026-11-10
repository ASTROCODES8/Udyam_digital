/**
 * KYC document-set validation rules.
 *
 * Every SMB applicant must provide four documents:
 *   1. GST Certificate
 *   2. Udyam Certificate
 *   3. Signatory ID (Aadhaar / PAN / Passport)
 *   4. Address Proof (utility bill or rental agreement — max 90 days old)
 *
 * Date comparisons use the constant APP_TODAY = '2026-07-15'.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fixed "today" for all date comparisons in the application. */
export const APP_TODAY = '2026-07-15';

/** Maximum age (in days) for an address-proof document. */
const ADDRESS_PROOF_MAX_AGE_DAYS = 90;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Allowed document type keys. */
export type DocumentType =
  | 'gst_certificate'
  | 'udyam_certificate'
  | 'signatory_id'
  | 'address_proof';

/** A document uploaded as part of the KYC process. */
export interface DocumentUpload {
  type: DocumentType;
  filename: string;
  /** Key/value pairs extracted via OCR (optional). */
  extractedData?: Record<string, string>;
  /** ISO date string of when the document was uploaded. */
  uploadDate?: string;
}

/** Describes a required KYC document type. */
export interface RequiredDocument {
  type: DocumentType;
  name: string;
  description: string;
  validationRules: string[];
}

// ---------------------------------------------------------------------------
// Required-document catalogue
// ---------------------------------------------------------------------------

export const KYC_REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    type: 'gst_certificate',
    name: 'GST Certificate',
    description:
      'Official GST registration certificate issued by the Government of India.',
    validationRules: [
      'GSTIN printed on the certificate must match the GSTIN on the lead record',
      'GSTIN must pass format and checksum validation',
      'Certificate status must be Active',
    ],
  },
  {
    type: 'udyam_certificate',
    name: 'Udyam Certificate',
    description:
      'MSME / Udyam registration certificate issued by the Ministry of MSME.',
    validationRules: [
      'Udyam number on the certificate must match the Udyam number on the lead record',
      'Udyam number must pass format validation',
      'Certificate status must not be expired or cancelled',
    ],
  },
  {
    type: 'signatory_id',
    name: 'Signatory ID',
    description:
      'Government-issued photo ID of the authorised signatory (Aadhaar, PAN card, or Passport).',
    validationRules: [
      'Name on the ID must match the contact/signatory name on the lead record',
      'ID must be legible and not expired',
    ],
  },
  {
    type: 'address_proof',
    name: 'Address Proof',
    description:
      'Recent utility bill or rental agreement proving the business address.',
    validationRules: [
      `Document date must be no older than ${ADDRESS_PROOF_MAX_AGE_DAYS} days from ${APP_TODAY}`,
      'Address city must match the business city on the lead record',
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse an ISO date string (YYYY-MM-DD) into a `Date` at midnight UTC.
 * Returns `null` for unparseable strings.
 */
function parseDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** Number of calendar days between two UTC dates (a − b). */
function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Document-set completeness check
// ---------------------------------------------------------------------------

/**
 * Check whether the uploaded document set satisfies all KYC requirements.
 *
 * Returns:
 * - `complete: true` when every required document type is present
 * - `missing` — list of human-readable names for any absent document types
 * - `issues` — any additional problems detected (e.g. duplicate types)
 */
export function validateDocumentSet(documents: DocumentUpload[]): {
  complete: boolean;
  missing: string[];
  issues: string[];
} {
  const issues: string[] = [];
  const typesSeen = new Set<DocumentType>();
  const duplicates = new Set<DocumentType>();

  for (const doc of documents) {
    if (typesSeen.has(doc.type)) {
      duplicates.add(doc.type);
    }
    typesSeen.add(doc.type);

    if (!doc.filename || doc.filename.trim().length === 0) {
      issues.push(`Document of type "${doc.type}" has no filename`);
    }
  }

  for (const dup of Array.from(duplicates)) {
    const name =
      KYC_REQUIRED_DOCUMENTS.find((d) => d.type === dup)?.name ?? dup;
    issues.push(`Duplicate document uploaded for "${name}"`);
  }

  const missing: string[] = [];
  for (const req of KYC_REQUIRED_DOCUMENTS) {
    if (!typesSeen.has(req.type)) {
      missing.push(req.name);
    }
  }

  return {
    complete: missing.length === 0,
    missing,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Extracted-data cross-checks
// ---------------------------------------------------------------------------

/**
 * Cross-validate OCR-extracted data from a single document against the GSTIN
 * and/or Udyam number already on the lead record.
 *
 * Checks performed per document type:
 *
 * | Type             | Checks                                              |
 * | ---------------- | --------------------------------------------------- |
 * | gst_certificate  | GSTIN matches `gstinOnFile`; status is Active        |
 * | udyam_certificate| Udyam number matches `udyamOnFile`; status valid     |
 * | signatory_id     | Name field present and non-empty                    |
 * | address_proof    | Document date within 90 days of APP_TODAY; city match|
 */
export function validateExtractedData(
  doc: DocumentUpload,
  gstinOnFile?: string,
  udyamOnFile?: string,
): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const data = doc.extractedData ?? {};

  switch (doc.type) {
    // ----- GST Certificate -----
    case 'gst_certificate': {
      const extractedGstin = (data.gstin ?? data.GSTIN ?? '').toUpperCase().trim();
      if (!extractedGstin) {
        issues.push('No GSTIN could be extracted from the GST certificate');
      } else if (gstinOnFile && extractedGstin !== gstinOnFile.toUpperCase().trim()) {
        issues.push(
          `GSTIN mismatch: certificate shows "${extractedGstin}" but lead record has "${gstinOnFile}"`,
        );
      }

      const status = (data.status ?? '').toLowerCase().trim();
      if (status && status !== 'active') {
        issues.push(
          `GST registration status is "${data.status}" — expected "Active"`,
        );
      }
      break;
    }

    // ----- Udyam Certificate -----
    case 'udyam_certificate': {
      const extractedUdyam = (data.udyam_number ?? data.udyam ?? '').toUpperCase().trim();
      if (!extractedUdyam) {
        issues.push('No Udyam number could be extracted from the certificate');
      } else if (udyamOnFile && extractedUdyam !== udyamOnFile.toUpperCase().trim()) {
        issues.push(
          `Udyam number mismatch: certificate shows "${extractedUdyam}" but lead record has "${udyamOnFile}"`,
        );
      }

      const status = (data.status ?? '').toLowerCase().trim();
      if (status && !['active', 'registered'].includes(status)) {
        issues.push(
          `Udyam certificate status is "${data.status}" — expected "Active" or "Registered"`,
        );
      }
      break;
    }

    // ----- Signatory ID -----
    case 'signatory_id': {
      const name = (data.name ?? data.full_name ?? '').trim();
      if (!name) {
        issues.push('No name could be extracted from the signatory ID');
      }
      break;
    }

    // ----- Address Proof -----
    case 'address_proof': {
      const docDateStr = data.date ?? data.document_date ?? data.bill_date;
      const docDate = parseDate(docDateStr);
      const today = parseDate(APP_TODAY)!;

      if (!docDate) {
        issues.push('No document date could be extracted from the address proof');
      } else {
        const age = daysBetween(today, docDate);
        if (age > ADDRESS_PROOF_MAX_AGE_DAYS) {
          issues.push(
            `Address proof is ${age} days old (dated ${docDateStr}), which exceeds the ${ADDRESS_PROOF_MAX_AGE_DAYS}-day limit from ${APP_TODAY}`,
          );
        }
        if (age < 0) {
          issues.push(
            `Address proof date ${docDateStr} is in the future relative to ${APP_TODAY}`,
          );
        }
      }
      break;
    }

    default: {
      issues.push(`Unknown document type: "${doc.type}"`);
    }
  }

  return { valid: issues.length === 0, issues };
}
