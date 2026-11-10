/**
 * Mock OCR extraction layer.
 *
 * In production this calls Gemini Vision (gemini-3.8-flash with fallback to gemini-2.5-flash)
 * to extract fields from uploaded document images.
 *
 * Ground truth defect matrix (8 defects, 4 clean baselines):
 *   - K01: Cancelled GSTIN in registry & Blank Udyam Number on certificate
 *   - K02: GST certificate photographed at a slant (deskew applied, soft notice)
 *   - K03: Clean Baseline
 *   - K04: GST certificate blurred & unreadable (re-upload requested)
 *   - K05: Missing Udyam certificate (only 3 documents uploaded)
 *   - K06: GSTIN character tampering (8189 vs registered 5189, checksum fails)
 *   - K07: Business entity name mismatch (Shri Physio Clinic vs Neelgiri Physio Clinic)
 *   - K08: Clean Baseline
 *   - K09: Clean Baseline
 *   - K10: Signatory authorization mismatch (Nisha Arora vs Fatima Menon)
 *   - K11: Address proof bill dated 2025-10-31 (257 days old > 90 days limit)
 *   - K12: Clean Baseline
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractionResult {
  /** Whether extraction succeeded at all. */
  success: boolean;
  /** Detected document type label. */
  documentType: string;
  /** Key/value pairs pulled from the document. */
  extractedFields: Record<string, string>;
  /** 0–1 confidence score. */
  confidence: number;
  /** Human-readable issues encountered during extraction. */
  issues: string[];
  /** Quality metadata */
  isSkewed?: boolean;
  isBlurred?: boolean;
}

// ---------------------------------------------------------------------------
// Mock extraction data (K01 – K12)
// ---------------------------------------------------------------------------

/**
 * Mock extraction results keyed by filename prefix (e.g. "K01_gst").
 *
 * Naming convention assumed: `K{nn}_{doctype}.{ext}` where doctype is one of
 * `gst`, `udyam`, `id`, `address`.
 */
export const MOCK_EXTRACTIONS: Record<string, ExtractionResult> = {
// ── K01 ──────────────────────────────────────────
  K01_gst: {
    success: true,
    documentType: 'gst_certificate',
    extractedFields: {
      gstin: '37IHKXV5167L1ZS',
      legal_name: 'Neha Kaur (Prop. Vindhya Tours & Travels)',
      trade_name: 'Vindhya Tours & Travels',
      status: 'Cancelled',
    },
    confidence: 0.97,
    issues: ['GSTIN is Cancelled in official registry'],
  },
  K01_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: '',
      enterprise_name: 'Vindhya Tours & Travels',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      status: 'Active',
    },
    confidence: 0.95,
    issues: ['Udyam registration number is blank on certificate'],
  },
  K01_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Neha Kaur',
      designation: 'Office admin',
      business_name: 'Vindhya Tours & Travels',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-346190',
      valid_till: '2028-03-26',
    },
    confidence: 0.96,
    issues: [],
  },
  K01_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Vindhya Tours & Travels',
      address: 'Shop/Unit 1, Tech Park Road, Visakhapatnam, Andhra Pradesh - 118383',
      city: 'Visakhapatnam',
      date: '2026-06-26',
      consumer_no: '9485717625',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: [],
  },

// ── K02 ──────────────────────────────────────────
  K02_gst: {
    success: true,
    documentType: 'gst_certificate',
    isSkewed: true,
    extractedFields: {
      gstin: '19EOGXH4115Y1ZL',
      legal_name: 'Joseph Shah (Prop. Harmony Dental Care)',
      trade_name: 'Harmony Dental Care',
      status: 'Active',
    },
    confidence: 0.97,
    issues: ['Document photographed at a slant. Auto-deskew applied.'],
  },
  K02_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: 'UDYAM-WB-00-5053330',
      enterprise_name: 'Harmony Dental Care',
      city: 'Kolkata',
      state: 'West Bengal',
      status: 'Active',
    },
    confidence: 0.95,
    issues: [],
  },
  K02_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Joseph Shah',
      designation: 'Manager',
      business_name: 'Harmony Dental Care',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-816907',
      valid_till: '2028-09-10',
    },
    confidence: 0.96,
    issues: [],
  },
  K02_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Harmony Dental Care',
      address: 'Shop/Unit 199, Station Road, Kolkata, West Bengal - 347550',
      city: 'Kolkata',
      date: '2026-05-22',
      consumer_no: '9790713533',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: [],
  },

// ── K03 ──────────────────────────────────────────
  K03_gst: {
    success: true,
    documentType: 'gst_certificate',
    extractedFields: {
      gstin: '27XUIXG0767D1ZP',
      legal_name: 'Joseph Singh (Prop. Ganesh Woodcraft)',
      trade_name: 'Ganesh Woodcraft',
      status: 'Active',
    },
    confidence: 0.97,
    issues: [],
  },
  K03_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: 'UDYAM-MH-00-9516696',
      enterprise_name: 'Ganesh Woodcraft',
      city: 'Nagpur',
      state: 'Maharashtra',
      status: 'Active',
    },
    confidence: 0.95,
    issues: [],
  },
  K03_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Joseph Singh',
      designation: 'Owner',
      business_name: 'Ganesh Woodcraft',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-447889',
      valid_till: '2028-07-04',
    },
    confidence: 0.96,
    issues: [],
  },
  K03_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Ganesh Woodcraft',
      address: 'Shop/Unit 80, Civil Lines, Nagpur, Maharashtra - 411231',
      city: 'Nagpur',
      date: '2026-05-30',
      consumer_no: '3438517928',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: [],
  },

// ── K04 ──────────────────────────────────────────
  K04_gst: {
    success: true,
    documentType: 'gst_certificate',
    isBlurred: true,
    extractedFields: {
      gstin: '27PZSXS1936O1ZH',
      legal_name: 'Saffron Dental Care LLP',
      trade_name: 'Saffron Dental Care LLP',
      status: 'Active',
    },
    confidence: 0.45,
    issues: ['GST certificate photo is severely blurred. Re-upload requested.'],
  },
  K04_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: 'UDYAM-MH-00-6131836',
      enterprise_name: 'Saffron Dental Care LLP',
      city: 'Nagpur',
      state: 'Maharashtra',
      status: 'Active',
    },
    confidence: 0.95,
    issues: [],
  },
  K04_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Fatima Pillai',
      designation: 'Partner',
      business_name: 'Saffron Dental Care LLP',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-609396',
      valid_till: '2028-08-03',
    },
    confidence: 0.96,
    issues: [],
  },
  K04_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Saffron Dental Care LLP',
      address: 'Shop/Unit 75, Lake View Colony, Nagpur, Maharashtra - 137452',
      city: 'Nagpur',
      date: '2026-05-28',
      consumer_no: '7397844759',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: [],
  },

// ── K05 ──────────────────────────────────────────
  K05_gst: {
    success: true,
    documentType: 'gst_certificate',
    extractedFields: {
      gstin: '32TZAXB5481U1Z1',
      legal_name: 'Balaji Realty LLP',
      trade_name: 'Balaji Realty LLP',
      status: 'Active',
    },
    confidence: 0.97,
    issues: [],
  },
  K05_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Anita Shah',
      designation: 'Owner',
      business_name: 'Balaji Realty LLP',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-587234',
      valid_till: '2029-09-11',
    },
    confidence: 0.96,
    issues: [],
  },
  K05_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Balaji Realty LLP',
      address: 'Shop/Unit 38, Civil Lines, Kochi, Kerala - 752083',
      city: 'Kochi',
      date: '2026-06-11',
      consumer_no: '4294969054',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: [],
  },

// ── K06 ──────────────────────────────────────────
  K06_gst: {
    success: true,
    documentType: 'gst_certificate',
    extractedFields: {
      gstin: '08YKZXS8189L1Z0',
      legal_name: 'Pooja Shah (Prop. Saffron Unisex Salon)',
      trade_name: 'Saffron Unisex Salon',
      status: 'Active',
    },
    confidence: 0.97,
    issues: ['Checksum validation mismatch detected: altered 8th digit (8189 vs official registry 5189)'],
  },
  K06_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: 'UDYAM-RJ-00-6577157',
      enterprise_name: 'Saffron Unisex Salon',
      city: 'Jaipur',
      state: 'Rajasthan',
      status: 'Active',
    },
    confidence: 0.95,
    issues: [],
  },
  K06_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Pooja Shah',
      designation: 'Owner',
      business_name: 'Saffron Unisex Salon',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-118354',
      valid_till: '2028-09-15',
    },
    confidence: 0.96,
    issues: [],
  },
  K06_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Saffron Unisex Salon',
      address: 'Shop/Unit 71, Market Yard, Jaipur, Rajasthan - 194057',
      city: 'Jaipur',
      date: '2026-06-11',
      consumer_no: '9566781101',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: [],
  },

// ── K07 ──────────────────────────────────────────
  K07_gst: {
    success: true,
    documentType: 'gst_certificate',
    extractedFields: {
      gstin: '07CPCXN0398P1ZT',
      legal_name: 'Neha Banerjee (Prop. Shri Physio Clinic)',
      trade_name: 'Neelgiri Physio Clinic',
      status: 'Active',
    },
    confidence: 0.97,
    issues: ['Certificate business name "Prop. Shri Physio Clinic" does not match registry legal entity "Neelgiri Physio Clinic"'],
  },
  K07_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: 'UDYAM-DL-00-9565547',
      enterprise_name: 'Neelgiri Physio Clinic',
      city: 'Delhi',
      state: 'Delhi',
      status: 'Active',
    },
    confidence: 0.95,
    issues: [],
  },
  K07_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Neha Banerjee',
      designation: 'Manager',
      business_name: 'Neelgiri Physio Clinic',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-178237',
      valid_till: '2030-05-05',
    },
    confidence: 0.96,
    issues: [],
  },
  K07_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Neelgiri Physio Clinic',
      address: 'Shop/Unit 52, Transport Nagar, Delhi, Delhi - 334596',
      city: 'Delhi',
      date: '2026-07-05',
      consumer_no: '7545812405',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: [],
  },

// ── K08 ──────────────────────────────────────────
  K08_gst: {
    success: true,
    documentType: 'gst_certificate',
    extractedFields: {
      gstin: '24XORXG9365M1Z3',
      legal_name: 'Joseph Rao (Prop. Green Leaf Legal Associates)',
      trade_name: 'Green Leaf Legal Associates',
      status: 'Active',
    },
    confidence: 0.97,
    issues: [],
  },
  K08_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: 'UDYAM-GJ-00-8477445',
      enterprise_name: 'Green Leaf Legal Associates',
      city: 'Vadodara',
      state: 'Gujarat',
      status: 'Active',
    },
    confidence: 0.95,
    issues: [],
  },
  K08_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Joseph Rao',
      designation: 'Office admin',
      business_name: 'Green Leaf Legal Associates',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-393148',
      valid_till: '2027-09-18',
    },
    confidence: 0.96,
    issues: [],
  },
  K08_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Green Leaf Legal Associates',
      address: 'Shop/Unit 238, Ring Road, Vadodara, Gujarat - 348176',
      city: 'Vadodara',
      date: '2026-05-26',
      consumer_no: '2568472785',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: [],
  },

// ── K09 ──────────────────────────────────────────
  K09_gst: {
    success: true,
    documentType: 'gst_certificate',
    extractedFields: {
      gstin: '37LDYXK0296F1ZB',
      legal_name: 'Anita Kulkarni (Prop. Kaveri Insurance Advisors)',
      trade_name: 'Kaveri Insurance Advisors',
      status: 'Active',
    },
    confidence: 0.97,
    issues: [],
  },
  K09_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: 'UDYAM-AP-00-9751562',
      enterprise_name: 'Kaveri Insurance Advisors',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      status: 'Active',
    },
    confidence: 0.95,
    issues: [],
  },
  K09_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Anita Kulkarni',
      designation: 'Office admin',
      business_name: 'Kaveri Insurance Advisors',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-126040',
      valid_till: '2027-12-22',
    },
    confidence: 0.96,
    issues: [],
  },
  K09_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Kaveri Insurance Advisors',
      address: 'Shop/Unit 217, Civil Lines, Visakhapatnam, Andhra Pradesh - 405337',
      city: 'Visakhapatnam',
      date: '2026-07-10',
      consumer_no: '9375012581',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: [],
  },

// ── K10 ──────────────────────────────────────────
  K10_gst: {
    success: true,
    documentType: 'gst_certificate',
    extractedFields: {
      gstin: '27QHJXK0658U1ZL',
      legal_name: 'Kaveri Stays LLP',
      trade_name: 'Kaveri Stays LLP',
      status: 'Active',
    },
    confidence: 0.97,
    issues: [],
  },
  K10_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: 'UDYAM-MH-00-7183141',
      enterprise_name: 'Kaveri Stays LLP',
      city: 'Mumbai',
      state: 'Maharashtra',
      status: 'Active',
    },
    confidence: 0.95,
    issues: [],
  },
  K10_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Nisha Arora',
      designation: 'Owner',
      business_name: 'Kaveri Stays LLP',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-247542',
      valid_till: '2029-06-01',
    },
    confidence: 0.96,
    issues: ['Signatory photo ID name (Nisha Arora) does not match lead business contact (Fatima Menon)'],
  },
  K10_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Kaveri Stays LLP',
      address: 'Shop/Unit 21, Sector 14, Mumbai, Maharashtra - 570043',
      city: 'Mumbai',
      date: '2026-06-18',
      consumer_no: '6910330901',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: [],
  },

// ── K11 ──────────────────────────────────────────
  K11_gst: {
    success: true,
    documentType: 'gst_certificate',
    extractedFields: {
      gstin: '03KGZXT1320R1ZZ',
      legal_name: 'Trinity Bake House Pvt Ltd',
      trade_name: 'Trinity Bake House Pvt Ltd',
      status: 'Active',
    },
    confidence: 0.97,
    issues: [],
  },
  K11_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: 'UDYAM-PB-00-9719478',
      enterprise_name: 'Trinity Bake House Pvt Ltd',
      city: 'Ludhiana',
      state: 'Punjab',
      status: 'Active',
    },
    confidence: 0.95,
    issues: [],
  },
  K11_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Vikram Pillai',
      designation: 'Owner',
      business_name: 'Trinity Bake House Pvt Ltd',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-440312',
      valid_till: '2028-12-23',
    },
    confidence: 0.96,
    issues: [],
  },
  K11_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Trinity Bake House Pvt Ltd',
      address: 'Shop/Unit 188, Industrial Area Phase 2, Ludhiana, Punjab - 541498',
      city: 'Ludhiana',
      date: '2025-10-31',
      consumer_no: '2710511786',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: ['Address proof bill date 2025-10-31 is 257 days old (>90 days limit relative to 2026-07-15)'],
  },

// ── K12 ──────────────────────────────────────────
  K12_gst: {
    success: true,
    documentType: 'gst_certificate',
    extractedFields: {
      gstin: '37NBLXS1145E1ZU',
      legal_name: 'Pooja Agarwal (Prop. Star Electronics)',
      trade_name: 'Star Electronics',
      status: 'Active',
    },
    confidence: 0.97,
    issues: [],
  },
  K12_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: 'UDYAM-AP-00-5186772',
      enterprise_name: 'Star Electronics',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      status: 'Active',
    },
    confidence: 0.95,
    issues: [],
  },
  K12_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: 'Pooja Agarwal',
      designation: 'Owner',
      business_name: 'Star Electronics',
      id_type: 'Photo ID',
      id_number: 'SYN-ID-365512',
      valid_till: '2029-03-03',
    },
    confidence: 0.96,
    issues: [],
  },
  K12_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: 'Star Electronics',
      address: 'Shop/Unit 216, Nehru Nagar, Visakhapatnam, Andhra Pradesh - 762071',
      city: 'Visakhapatnam',
      date: '2026-07-06',
      consumer_no: '6982457282',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: [],
  },
};

// ---------------------------------------------------------------------------
// Filename → mock key resolution
// ---------------------------------------------------------------------------

/**
 * Derive a mock-lookup key from a filename.
 *
 * Supports patterns like:
 *   `K03_address_proof.png`  →  `K03_address`
 *   `K05_gst_certificate.pdf` →  `K05_gst`
 *   `K07_id.jpg`             →  `K07_id`
 */
function resolveMockKey(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, '').toUpperCase();

  // Try exact match first (e.g. "K01_GST")
  const directMatch = Object.keys(MOCK_EXTRACTIONS).find(
    (k) => k.toUpperCase() === base,
  );
  if (directMatch) return directMatch;

  // Extract applicant prefix (K01–K12)
  const applicantMatch = base.match(/^(K\d{2})/);
  if (!applicantMatch) return null;
  const prefix = applicantMatch[1];

  // Map document-type keywords
  const lower = filename.toLowerCase();
  if (lower.includes('gst')) return `${prefix}_gst`;
  if (lower.includes('udyam')) return `${prefix}_udyam`;
  if (lower.includes('id') || lower.includes('signatory') || lower.includes('aadhaar') || lower.includes('pan') || lower.includes('passport'))
    return `${prefix}_id`;
  if (lower.includes('address') || lower.includes('utility') || lower.includes('bill') || lower.includes('rental'))
    return `${prefix}_address`;

  return null;
}

// ---------------------------------------------------------------------------
// Public extraction function with Gemini Vision + Mock Fallback
// ---------------------------------------------------------------------------

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Extract structured data from a document image.
 *
 * Attempts Gemini Vision if an image buffer and API key are available,
 * and falls back to deterministic mock data keyed on the filename.
 */
export async function extractDocument(
  filename: string,
  imageBuffer?: Buffer,
  mimeType: string = "image/png",
  docType?: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // 1. If buffer and API key exist, try Gemini Vision (gemini-3.8-flash with fallback to gemini-2.5-flash)
  if (imageBuffer && apiKey && apiKey.length > 5) {
    const candidateModels = [
      process.env.GEMINI_MODEL || "gemini-3.8-flash",
      process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash",
    ];

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `Extract all details from this Indian business/identity document as JSON.
Document category expected: ${docType || "business identity document"}.
Fields to extract if visible:
- For GST certificate: gstin, legal_name, trade_name, constitution, address, date, status.
- For Udyam certificate: udyam_number, enterprise_name, enterprise_type, date, status.
- For Signatory ID: name, id_number, dob_or_expiry, id_type (PAN/Aadhaar/Passport).
- For Address Proof: name, address, city, bill_date, doc_type.
Return only valid JSON object with extracted key-value string pairs.`;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        });

        const generatePromise = model.generateContent([
          prompt,
          {
            inlineData: {
              data: imageBuffer.toString("base64"),
              mimeType: mimeType || "image/png",
            },
          },
        ]);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini OCR timeout after 8000ms on ${modelName}`)), 8000)
        );

        const result: any = await Promise.race([generatePromise, timeoutPromise]);

        const text = result.response.text();
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        // Reconcile common OCR visual ambiguities (e.g. O vs 0, I vs 1)
        if (parsed.gstin) {
          const { reconcileOCRGstin } = await import("./gstin");
          parsed.gstin = reconcileOCRGstin(parsed.gstin);
        }

        return {
          success: true,
          documentType: docType || "verified_document",
          extractedFields: parsed,
          confidence: 0.95,
          issues: [],
        };
      } catch (visionErr) {
        console.warn(`[Smart KYC OCR] Model ${modelName} failed for ${filename}, attempting fallback if available:`, visionErr);
      }
    }
  }

  // ── 2. Mock fallback ──────────────────────────────────────────────────
  const key = resolveMockKey(filename);
  if (key && MOCK_EXTRACTIONS[key]) {
    return MOCK_EXTRACTIONS[key];
  }

  // Try matching directly against K01-K12 from matrix
  const baseName = filename.replace(/\.[^.]+$/, "");
  if (MOCK_EXTRACTIONS[baseName]) {
    return MOCK_EXTRACTIONS[baseName];
  }

  // Unknown file — return a failure result
  return {
    success: false,
    documentType: docType || "unknown",
    extractedFields: {},
    confidence: 0,
    issues: [
      `Could not extract data from "${filename}": no matching mock data and Gemini Vision unavailable`,
    ],
  };
}
