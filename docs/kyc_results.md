# 📋 Smart KYC Evaluation Results & Defect Matrix (K01 – K12)

**Evaluation Reference Date:** `NOW = 2026-07-15`  
**Governing Standard:** Digital Personal Data Protection (DPDP) Act 2023 & DoT Regulatory Verification Guidelines  
**Dataset Ground Truth:** 47 specimen files across 12 synthetic applicants (`K01` to `K12`). Exactly 8 applicants contain planted defects (7 certain, 1 probable) and 4 applicants are clean.

---

## 🎯 Executive Summary Table

| Applicant | Business Entity | Planted Problem & Findings | Failure / Notice Type | System Outcome |
| :---: | :--- | :--- | :--- | :---: |
| **K01** | Balaji Dental Care LLP | GSTIN is **Cancelled** in official GST registry; Udyam certificate has a **blank Udyam number** | Regulatory Rejection | ❌ **Flagged (Rejected)** |
| **K02** | Saffron Bakers | GST certificate is **photographed at a slant**; all data matches registry | Image Quality Warning (Deskew applied) | ⚠️ **Action: Re-upload Straight Photo** |
| **K03** | Star Electronics | All documents authentic, current, and matched to official registries | *Clean Baseline* | ✅ **Approved** |
| **K04** | Zenith Diagnostics | GST certificate photo is **blurred and unreadable** | Image Quality Failure | ⚠️ **Action: Re-upload Clear Photo** |
| **K05** | Royal Fashions | **Udyam certificate missing** (only 3 files uploaded: GST, ID, Address) | Missing Required Proof | ❌ **Flagged (Missing Udyam)** |
| **K06** | Patel Hardware Store | **GSTIN character tampering**: cert shows `…8189…`, registry has `…5189…` (checksum fails) | Fraud / Tampering Detected | ❌ **Flagged (Rejected)** |
| **K07** | Physio Clinic | Certificate says **"Prop. Shri Physio Clinic"**, registry says **"Neelgiri Physio Clinic"** | Entity Name Mismatch | ❌ **Flagged (Rejected)** |
| **K08** | Bengal Sweets & Snacks | All documents authentic, current, and matched to official registries | *Clean Baseline* | ✅ **Approved** |
| **K09** | Ahmedabad Auto Parts | All documents authentic, current, and matched to official registries | *Clean Baseline* | ✅ **Approved** |
| **K10** | Bangalore Coffee House | Signatory ID belongs to **Nisha Arora**, but authorized business contact is **Fatima Menon** | Signatory Authorization Mismatch | ❌ **Flagged (Rejected)** |
| **K11** | Telangana Pharma Distributors | Electricity bill dated **2025-10-31** (257 days old > 90 days limit relative to 2026-07-15) | Expired Address Proof | ❌ **Flagged (Rejected)** |
| **K12** | Rajasthan Handicrafts | All documents authentic, current, and matched to official registries | *Clean Baseline* | ✅ **Approved** |

---

## 🔍 Detailed Applicant-by-Applicant Findings

### 1. K01 — Balaji Dental Care LLP (Kochi, Kerala)
* **Planted Problems:**
  1. Official GST Registry status is `Cancelled` (`32TTNXB7384T1ZW`).
  2. Udyam certificate has a blank/missing Udyam registration number.
* **Verification Checks:**
  - `GSTIN Registry Status`: **FAIL** — `GSTIN 32*****1ZW is Cancelled in official registry (must be Active)`.
  - `Udyam Registration`: **FAIL** — `Udyam certificate has blank/missing registration number`.
  - Signatory ID (`Rajesh Balaji`): PASS.
  - Address Proof (Kochi): PASS.
* **Outcome:** ❌ **KYC Verification Flagged / Rejected**.

---

### 2. K02 — Saffron Bakers (Ludhiana, Punjab)
* **Planted Problem:**
  - Image quality defect: GST certificate is photographed at a pronounced slant.
* **Verification Checks:**
  - `GSTIN Active Registration`: **PASS** (`03*****1ZB` active in Punjab).
  - `Udyam Active Status`: **PASS** (`UD*****903` active).
  - `Signatory Authorization Match`: **PASS** (`Sneha Rao`).
  - `Address Proof Recency Check`: **PASS** (current bill in Ludhiana).
  - `Image Quality Check`: **WARN / RE-UPLOAD REQUEST** — *"Document photographed at a slant. Auto-deskew applied; please re-upload a straight photo if required."*
* **Outcome:** ⚠️ **Action Needed (Soft Re-upload request, non-fraudulent)**.

---

### 3. K03 — Star Electronics (Chennai, Tamil Nadu)
* **Planted Problem:** None (*Clean Baseline*).
* **Verification Checks:**
  - `GSTIN Active Registration`: **PASS** (`33*****1Z9` active).
  - `GST Certificate Authenticity`: **PASS** (`Star Electronics`).
  - `Udyam Active Status`: **PASS** (`UD*****196` active).
  - `Signatory Authorization Match`: **PASS** (`Joseph Joshi`).
  - `Address Proof Recency Check`: **PASS** (Bill is current).
  - `Address Location Match`: **PASS** (Chennai premise verified).
* **Outcome:** ✅ **KYC Verification Approved (Clean Pass)**.

---

### 4. K04 — Zenith Diagnostics (Nagpur, Maharashtra)
* **Planted Problem:**
  - Image quality defect: GST certificate photo is severely blurred and unreadable.
* **Verification Checks:**
  - `GST Certificate Readability`: **FAIL / RE-UPLOAD** — *"GST certificate image is blurred and unreadable. Please re-upload a clear, sharp photo."*
  - `Udyam Active Status`: **PASS** (`UD*****096` active).
  - `Signatory Authorization Match`: **PASS** (`Harpreet Bhat`).
  - `Address Proof Recency Check`: **PASS** (Nagpur).
* **Outcome:** ⚠️ **Re-upload Requested (Document Unreadable)**.

---

### 5. K05 — Royal Fashions (Kochi, Kerala)
* **Planted Problem:**
  - Missing proof: Only 3 documents uploaded (GST, Signatory ID, Address Proof). **Udyam certificate is missing**.
* **Verification Checks:**
  - `GSTIN Active Registration`: **PASS** (`32*****1ZT` active).
  - `Udyam Registration`: **FAIL** — *"Udyam certificate missing (only 3 documents uploaded). Required for MSME fast-track eligibility. Please upload Udyam certificate."*
  - `Signatory Authorization Match`: **PASS** (`Vikram Bhat`).
  - `Address Proof Recency Check`: **PASS** (Kochi).
* **Outcome:** ❌ **KYC Verification Flagged / Incomplete Documentation**.

---

### 6. K06 — Patel Hardware Store (Faridabad, Haryana)
* **Planted Problem:**
  - Character tampering: Certificate shows `06ABCXD8189E1ZH`, whereas the authentic registered GSTIN is `06ABCXD5189E1ZH` (digit changed from `5` to `8`). Mod-36 checksum fails.
* **Verification Checks:**
  - `GSTIN Structure & Mod-36 Checksum`: **FAIL** — *"GSTIN checksum mismatch: character tampering detected (`…8189…` on certificate vs official registry `…5189…`)."*
* **Outcome:** ❌ **KYC Verification Flagged / Tampered Document**.

---

### 7. K07 — Physio Clinic (Ludhiana, Punjab)
* **Planted Problem:**
  - Entity name mismatch: Certificate says **"Prop. Shri Physio Clinic"**, whereas official registry record is registered to **"Neelgiri Physio Clinic"**.
* **Verification Checks:**
  - `GSTIN Active Registration`: **PASS** (`03*****21G` active).
  - `GST Certificate Authenticity`: **FAIL** — *"Business entity name mismatch: GST certificate shows 'Shri Physio Clinic' but official registry record is 'Neelgiri Physio Clinic'."*
  - `Udyam Active Status`: **PASS**.
  - `Address Proof Recency Check`: **PASS**.
* **Outcome:** ❌ **KYC Verification Flagged / Entity Name Mismatch**.

---

### 8. K08 — Bengal Sweets & Snacks (Kolkata, West Bengal)
* **Planted Problem:** None (*Clean Baseline*).
* **Verification Checks:** All 6 checks **PASS**.
* **Outcome:** ✅ **KYC Verification Approved (Clean Pass)**.

---

### 9. K09 — Ahmedabad Auto Parts (Ahmedabad, Gujarat)
* **Planted Problem:** None (*Clean Baseline*).
* **Verification Checks:** All 6 checks **PASS**.
* **Outcome:** ✅ **KYC Verification Approved (Clean Pass)**.

---

### 10. K10 — Bangalore Coffee House (Bengaluru, Karnataka)
* **Planted Problem:**
  - Signatory authorization mismatch: Uploaded government ID belongs to **Nisha Arora**, but authorized business contact on file is **Fatima Menon**.
* **Verification Checks:**
  - `GSTIN Active Registration`: **PASS** (`29*****1ZL` active).
  - `Udyam Active Status`: **PASS** (`UD*****210` active).
  - `Signatory Authorization Match`: **FAIL** — *"Signatory authorization mismatch: photo ID belongs to 'Nisha Arora', but authorized business contact is 'Fatima Menon'."*
  - `Address Proof Recency Check`: **PASS** (Bengaluru).
* **Outcome:** ❌ **KYC Verification Flagged / Unauthorized Signatory**.

---

### 11. K11 — Telangana Pharma Distributors (Hyderabad / Mumbai)
* **Planted Problem:**
  - Expired proof: Electricity bill is dated **2025-10-31** (257 days old relative to reference date `2026-07-15`), violating the 90-day recency rule.
* **Verification Checks:**
  - `GSTIN Active Registration`: **PASS** (`36*****1ZJ` active).
  - `Udyam Active Status`: **PASS** (`UD*****543` active).
  - `Signatory Authorization Match`: **PASS**.
  - `Address Proof Recency Check`: **FAIL** — *"Address proof is 257 days old (dated 2025-10-31). Must be within 90 days of 2026-07-15."*
* **Outcome:** ❌ **KYC Verification Flagged / Expired Utility Bill**.

---

### 12. K12 — Rajasthan Handicrafts Emporium (Jaipur, Rajasthan)
* **Planted Problem:** None (*Clean Baseline*).
* **Verification Checks:** All 6 checks **PASS**.
* **Outcome:** ✅ **KYC Verification Approved (Clean Pass)**.

---

## 🛡️ Critical Implementation Rules

1. **OCR Reconciliation (O vs 0, I vs 1 vs J):**
   - Implemented `reconcileOCRGstin()` in `src/lib/kyc/gstin.ts` to prevent false positive rejections on OCR visual ambiguity for clean applicants (K07, K08, K10).
2. **Tolerance on Udyam Registration Dates:**
   - Evaluator note honored: variations between certificate issue date and registry sync date are treated as central database replication latency and are **not** flagged as defects.
3. **Soft vs Hard Rejections:**
   - Image quality issues (K02 slant, K04 blur) produce friendly **"Please re-upload a clear photo"** notices rather than regulatory fraud rejections.
