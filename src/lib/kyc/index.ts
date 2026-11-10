/**
 * KYC validation module — barrel re-exports.
 */

// GSTIN validation
export { validateGSTINFormat, validateGSTINChecksum } from './gstin';

// Udyam validation
export { validateUdyamFormat } from './udyam';

// Document-set validation & rules
export {
  APP_TODAY,
  KYC_REQUIRED_DOCUMENTS,
  validateDocumentSet,
  validateExtractedData,
} from './validators';
export type { DocumentUpload, DocumentType, RequiredDocument } from './validators';

// OCR extraction
export { extractDocument, MOCK_EXTRACTIONS } from './extract';
export type { ExtractionResult } from './extract';
