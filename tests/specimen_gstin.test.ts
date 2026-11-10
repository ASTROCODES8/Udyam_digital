import { describe, it, expect } from 'vitest';
import { validateGSTINFormat, reconcileOCRGstin, validateGSTINChecksum } from '../src/lib/kyc/gstin';

describe('Specimen Dataset GSTIN Checksums (K01-K12)', () => {
  it('strictly rejects tampered K06 GSTIN (08YKZXS8189L1Z0 / 08YKZXS8189L1ZO)', () => {
    // K06 certificate has digit 8 instead of 5
    const reconciled1 = reconcileOCRGstin('08YKZXS8189L1Z0');
    expect(validateGSTINChecksum(reconciled1)).toBe(false);

    const res1 = validateGSTINFormat('08YKZXS8189L1Z0');
    expect(res1.valid).toBe(false);
    expect(res1.errors[0]).toContain('Checksum mismatch');

    const reconciled2 = reconcileOCRGstin('08YKZXS8189L1ZO');
    expect(validateGSTINChecksum(reconciled2)).toBe(false);

    const res2 = validateGSTINFormat('08YKZXS8189L1ZO');
    expect(res2.valid).toBe(false);
    expect(res2.errors[0]).toContain('Checksum mismatch');
  });

  it('validates registered K06 GSTIN (08YKZXS5189L1ZO)', () => {
    const res = validateGSTINFormat('08YKZXS5189L1ZO');
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('validates K07 specimen GSTIN (07CPCXN0398P1ZT)', () => {
    const res = validateGSTINFormat('07CPCXN0398P1ZT');
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('validates K08 specimen GSTIN (24XORXG9365M1Z3 and with OCR O/0 reconcile)', () => {
    const resExact = validateGSTINFormat('24XORXG9365M1Z3');
    expect(resExact.valid).toBe(true);

    // If OCR misread slot 3 'O' as '0'
    const reconciled = reconcileOCRGstin('24X0RXG9365M1Z3');
    expect(reconciled).toBe('24XORXG9365M1Z3');
    expect(validateGSTINChecksum(reconciled)).toBe(true);
  });

  it('validates K09 specimen GSTIN (37LDYXK0296F1ZB)', () => {
    const res = validateGSTINFormat('37LDYXK0296F1ZB');
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('validates K10 specimen GSTIN (27QHJXK0658U1ZL)', () => {
    const res = validateGSTINFormat('27QHJXK0658U1ZL');
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('validates K11 specimen GSTIN (03KGZXT1320R1ZZ)', () => {
    const res = validateGSTINFormat('03KGZXT1320R1ZZ');
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('validates K12 specimen GSTIN (37NBLXS1145E1ZU)', () => {
    const res = validateGSTINFormat('37NBLXS1145E1ZU');
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('validates K01-K05 specimen GSTINs', () => {
    expect(validateGSTINFormat('37IHKXV5167L1ZS').valid).toBe(true); // K01
    expect(validateGSTINFormat('19EOGXH4115Y1ZL').valid).toBe(true); // K02
    expect(validateGSTINFormat('27XUIXG0767D1ZP').valid).toBe(true); // K03
    expect(validateGSTINFormat('27PZSXS1936O1ZH').valid).toBe(true); // K04
    expect(validateGSTINFormat('32TZAXB5481U1Z1').valid).toBe(true); // K05
  });
});
