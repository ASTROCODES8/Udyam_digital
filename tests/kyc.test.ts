import { describe, it, expect } from 'vitest';
import { validateGSTINFormat, validateGSTINChecksum, maskIdentifier } from '../src/lib/kyc/gstin';
import { validateUdyamFormat } from '../src/lib/kyc/udyam';
import { validateExtractedData } from '../src/lib/kyc/validators';

describe('GSTIN Validation & Mod-36 Checksum', () => {
  it('validates a correct GSTIN from the dataset (32TTNXB7384T1ZW)', () => {
    const res = validateGSTINFormat('32TTNXB7384T1ZW');
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('validates second correct GSTIN (03PJNXS4821G1ZB)', () => {
    const res = validateGSTINFormat('03PJNXS4821G1ZB');
    expect(res.valid).toBe(true);
  });

  it('allows X as 4th char of embedded PAN per case study instructions', () => {
    // 32 TTNX B 7384 T 1 Z W -> PAN is TTNXB7384T (4th char is X)
    const res = validateGSTINFormat('32TTNXB7384T1ZW');
    expect(res.valid).toBe(true);
  });

  it('detects a mod-36 checksum tampering error', () => {
    // Change last char from W to A
    const res = validateGSTINFormat('32TTNXB7384T1ZA');
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Checksum mismatch'))).toBe(true);
  });

  it('rejects an invalid state code outside 01-38 (e.g. state code 99)', () => {
    const res = validateGSTINFormat('99TTNXB7384T1ZW');
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Invalid state code'))).toBe(true);
  });

  it('rejects wrong length or empty string', () => {
    expect(validateGSTINFormat('32TTNX').valid).toBe(false);
    expect(validateGSTINFormat('').valid).toBe(false);
  });

  it('masks sensitive identifiers showing only first 2 and last 3 characters (DPDP Act)', () => {
    const masked = maskIdentifier('32TTNXB7384T1ZW');
    expect(masked.startsWith('32')).toBe(true);
    expect(masked.endsWith('1ZW')).toBe(true);
    expect(masked.includes('*****')).toBe(true);

    const maskedUdyam = maskIdentifier('UDYAM-KL-00-3078801');
    expect(maskedUdyam.startsWith('UD')).toBe(true);
    expect(maskedUdyam.endsWith('801')).toBe(true);
  });
});

describe('Udyam MSME Number Validation', () => {
  it('validates valid Udyam format (UDYAM-KL-00-3078801)', () => {
    const res = validateUdyamFormat('UDYAM-KL-00-3078801');
    expect(res.valid).toBe(true);
  });

  it('rejects Udyam with non-existent state code (UDYAM-ZZ-00-3078801)', () => {
    const res = validateUdyamFormat('UDYAM-ZZ-00-3078801');
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('not a recognised Indian state');
  });

  it('rejects district code other than 00 in this dataset', () => {
    const res = validateUdyamFormat('UDYAM-KL-99-3078801');
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('District code must be "00"');
  });
});

describe('KYC 90-Day Address Proof & Cross-Checks (Ref Date: 2026-07-15)', () => {
  it('accepts address proof within 90 days of 2026-07-15 (e.g. 2026-06-10)', () => {
    const check = validateExtractedData({
      type: 'address_proof',
      filename: 'K01_address_proof.png',
      extractedData: { date: '2026-06-10', city: 'Kochi' },
    });
    expect(check.valid).toBe(true);
  });

  it('rejects address proof older than 90 days from 2026-07-15 (K03 planted defect: 2026-03-01)', () => {
    const check = validateExtractedData({
      type: 'address_proof',
      filename: 'K03_address_proof.png',
      extractedData: { date: '2026-03-01', city: 'Pune' },
    });
    expect(check.valid).toBe(false);
    expect(check.issues[0]).toContain('exceeds the 90-day limit');
  });

  it('rejects address proof with future date relative to 2026-07-15', () => {
    const check = validateExtractedData({
      type: 'address_proof',
      filename: 'K01_address_proof.png',
      extractedData: { date: '2026-08-01', city: 'Kochi' },
    });
    expect(check.valid).toBe(false);
    expect(check.issues[0]).toContain('in the future relative to 2026-07-15');
  });

  it('flags GSTIN mismatch between certificate and lead record (K05 planted defect)', () => {
    const check = validateExtractedData(
      {
        type: 'gst_certificate',
        filename: 'K05_gst_certificate.png',
        extractedData: { gstin: '06AABCS1429B1Z1', status: 'Active' },
      },
      '27AABCS9999Z1Z5' // different on file
    );
    expect(check.valid).toBe(false);
    expect(check.issues[0]).toContain('GSTIN mismatch');
  });

  it('flags cancelled Udyam status (K09 planted defect)', () => {
    const check = validateExtractedData({
      type: 'udyam_certificate',
      filename: 'K09_udyam_certificate.png',
      extractedData: { udyam_number: 'UDYAM-DL-00-7788990', status: 'Cancelled' },
    });
    expect(check.valid).toBe(false);
    expect(check.issues[0]).toContain('Cancelled');
  });

  it('flags missing name on signatory ID', () => {
    const check = validateExtractedData({
      type: 'signatory_id',
      filename: 'corrupted_id.png',
      extractedData: { name: '' },
    });
    expect(check.valid).toBe(false);
    expect(check.issues[0]).toContain('No name could be extracted');
  });
});
