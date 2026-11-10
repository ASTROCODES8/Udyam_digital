# Empirical Lead & Funnel Analysis — Project Udyam Digital

> **Dataset:** `smb_leads.csv` (5,000 synthetic SMB leads, Q1/Q2 2026)
> **Generated:** Automatically by `scripts/analyse_leads.py`

---

## 1. Executive Summary & Core Metrics

| Metric | Value | Case Study Implication |
|---|---|---|
| **Total Leads** | `5,000` | Baseline cohort across Tier 1 & 2 cities |
| **Total Activated Customers** | `368` (**7.36%**) | Only 7.4% convert end-to-end; massive drop-off |
| **Blended CAC** | **₹15,053** | Total acquisition spend divided by activated accounts |
| **Average Time to Activate** | **17.6 days** (median: 17 days) | High friction from manual paperwork & site feasibility |
| **Average Follow-up Chases** | **3.0 calls** per customer | Customer chases support 3+ times due to lack of tracking |
| **6-Month Churn Rate** | **15.2%** (56 of 368) | High churn driven by mis-sold bundles and delayed installs |
| **Average NPS Score** | **6.86 / 10** | Neutral/detractor territory for B2B telecom |
| **Median Monthly Bundle Value** | **₹6,900** | Mean: ₹12,351 |

---

## 2. End-to-End Funnel Performance

```
Lead (5,000) ──68.1%──> Contacted (3,406) ──58.0%──> Needs Assessed (1,974)
    └──43.6%──> Quote Accepted (861) ──68.3%──> KYC Complete (588) ──62.6%──> Activated (368)
```

| Funnel Stage | Reached Leads | Stage-to-Stage Conversion | Cumulative Conversion |
|---|---|---|---|
| **Lead** | 5,000 | - | 100.0% |
| **Contacted** | 3,406 | 68.1% | 68.1% |
| **Needs assessed** | 1,974 | 58.0% | 39.5% |
| **Quote accepted** | 861 | 43.6% | 17.2% |
| **KYC complete** | 588 | 68.3% | 11.8% |
| **Activated** | 368 | 62.6% | 7.4% |

> [!IMPORTANT]
> **The Critical Leaks:**
> 1. **Needs Assessed → Quote Accepted (43.6% conversion):** The single biggest drop. Over 1,113 qualified prospects dropped because quotes were too slow, too complex, or perceived as overpriced.
> 2. **Lead → Contacted (68.1%):** 1,594 leads never engaged — unreachable numbers, wrong numbers, and cold outbound friction.
> 3. **Quote Accepted → KYC (68.3%):** 273 buyers who agreed to buy dropped due to cumbersome document collection.
> 4. **KYC → Activation (62.6%):** 220 fully verified buyers dropped due to >21 day installation delays.

---

## 3. Segment Breakdown & Strategy Prioritisation

| Segment | Total Leads | Activated | Conv. Rate | Median Spend/mo | Mean Spend/mo | Strategic Role |
|---|---|---|---|---|---|---|
| **Micro retail & services** | 2,709 | 110 | **4.06%** | ₹2,470 | ₹2,505 | **Volume Base (Self-Serve):** 54% of leads, lower ARPU (₹2.5k), must be zero-touch WhatsApp/partner |
| **Professional offices** | 1,247 | 138 | **11.07%** | ₹6,575 | ₹6,796 | **Primary Priority:** High conversion (11.1%), digitally ready, strong ARPU (₹6.6k/mo) |
| **Small manufacturers** | 289 | 37 | **12.8%** | ₹15,910 | ₹19,980 | **High Margin Niche:** 12.8% conversion, IoT & Leased Line demand (₹16k/mo) |
| **Small multi-site businesses** | 755 | 83 | **10.99%** | ₹28,080 | ₹31,233 | **High Value Priority:** Highest ARPU (₹28k/mo), complex bundles (SD-WAN, Leased Lines) |

---

## 4. Key Behavioral & Funnel Drivers

### A. GSTIN Presence is the #1 Predictor of Activation

| Has GSTIN? | Total Leads | Activated Leads | Activation Rate (%) | Insight |
|---|---|---|---|---|
| **Y** | 3,534 | 338 | **9.56%** | 4.7x higher conversion! Valid GSTIN unlocks 11 enterprise products. |
| **N** | 1,466 | 30 | **2.05%** | Requires lightweight starter bundle (Fibre 100 + SIM + POS) without GST dependency. |

### B. Lead Source Conversion & Efficiency

| Lead Source | Total Leads | Activated Leads | Activation Rate (%) | Analysis |
|---|---|---|---|---|
| **Field sales** | 1,720 | 125 | **7.27%** | **High CAC (7.3%):** Slow manual visits; expensive for micro businesses |
| **Channel partner** | 1,010 | 81 | **8.02%** | **Partner Assisted (8.0%):** Essential for local hardware and KYC handholding |
| **Website form** | 995 | 43 | **4.32%** | **Underperforming (4.3%):** Static form causes quote delay; GenAI advisor solves this directly |
| **Inbound call** | 504 | 48 | **9.52%** | **High Intent (9.5%):** Customer actively seeking connectivity |
| **Referral** | 413 | 61 | **14.77%** | **Top Performer (14.8%):** Trust-driven; build viral referral incentive in tracker |
| **WhatsApp campaign** | 358 | 10 | **2.79%** | **Cold Drop (2.8%):** Needs conversational interactive onboarding instead of blast messages |

### C. Geographic Tier Performance

| City Tier | Total Leads | Activated Leads | Activation Rate (%) | Notes |
|---|---|---|---|---|
| **Tier 1.0** | 2,578.0 | 221.0 | **8.57%** | Higher fibre density and faster dispatch |
| **Tier 2.0** | 2,422.0 | 147.0 | **6.07%** | Requires 5G AirFiber and partner-led local installation |

### D. Language Distribution

| Language | Total Leads | % Share | Activated | Activation Rate (%) |
|---|---|---|---|---|
| **Hindi** | 2,137 | 42.7% | 169 | 7.91% |
| **English** | 1,168 | 23.4% | 94 | 8.05% |
| **Marathi** | 505 | 10.1% | 32 | 6.34% |
| **Kannada** | 253 | 5.1% | 13 | 5.14% |
| **Gujarati** | 233 | 4.7% | 14 | 6.01% |
| **Telugu** | 207 | 4.1% | 16 | 7.73% |
| **Tamil** | 207 | 4.1% | 9 | 4.35% |
| **Bengali** | 111 | 2.2% | 10 | 9.01% |
| **Punjabi** | 96 | 1.9% | 4 | 4.17% |
| **Malayalam** | 83 | 1.7% | 7 | 8.43% |

> [!NOTE]
> **Top 3 Languages account for 76.2% of all leads:** Hindi (42.7%), English (23.4%), and Marathi (10.1%). Regional language support (Kannada, Telugu, Tamil, Gujarati) covers another 18%.

---

## 5. Granular Drop-Off Reasons by Funnel Stage

### Stage: `Lead` (1,594 dropped prospects)

| Drop Reason | Count | % of Stage Drops | System Solution |
|---|---|---|---|
| Unreachable after 3 attempts | 805 | 50.5% | Self-serve phone verification via WhatsApp OTP at session start |
| Not interested on first call | 470 | 29.5% | Targeted automated reminder & partner alert |
| Wrong or invalid number | 319 | 20.0% | Self-serve phone verification via WhatsApp OTP at session start |

### Stage: `Contacted` (1,432 dropped prospects)

| Drop Reason | Count | % of Stage Drops | System Solution |
|---|---|---|---|
| Owner had no time for a visit | 531 | 37.1% | Targeted automated reminder & partner alert |
| Locked in with current provider | 325 | 22.7% | Targeted automated reminder & partner alert |
| Visit not scheduled by sales | 296 | 20.7% | Targeted automated reminder & partner alert |
| Only wanted a mobile plan | 280 | 19.6% | Targeted automated reminder & partner alert |

### Stage: `Needs assessed` (1,113 dropped prospects)

| Drop Reason | Count | % of Stage Drops | System Solution |
|---|---|---|---|
| Price too high | 414 | 37.2% | Transparent monthly pricing with 'Cost Optimizer' toggle and starter tier |
| Competitor offered cheaper plan | 207 | 18.6% | Transparent monthly pricing with 'Cost Optimizer' toggle and starter tier |
| Quote too complex to understand | 206 | 18.5% | Plain-language benefit summary (replace product codes with business outcomes) |
| Quote took too long to arrive | 179 | 16.1% | Instant real-time quote generation in the GenAI advisor |
| Decided to wait | 107 | 9.6% | Targeted automated reminder & partner alert |

### Stage: `Quote accepted` (273 dropped prospects)

| Drop Reason | Count | % of Stage Drops | System Solution |
|---|---|---|---|
| Missing GST or Udyam document | 94 | 34.4% | Instant registry lookup (GSTIN/Udyam API) — auto-populates legal name & address |
| Found paperwork too long | 79 | 28.9% | Instant registry lookup (GSTIN/Udyam API) — auto-populates legal name & address |
| Authorised signatory not available | 53 | 19.4% | Digital e-sign link sent to owner via WhatsApp |
| Document details did not match | 47 | 17.2% | Targeted automated reminder & partner alert |

### Stage: `KYC complete` (220 dropped prospects)

| Drop Reason | Count | % of Stage Drops | System Solution |
|---|---|---|---|
| Installation delayed beyond 21 days | 98 | 44.5% | Dynamic install ETA based on `typical_install_days`, transparent live order tracker |
| Customer cancelled before install | 53 | 24.1% | Targeted automated reminder & partner alert |
| Site not feasible for fibre | 41 | 18.6% | Targeted automated reminder & partner alert |
| First payment failed | 28 | 12.7% | Targeted automated reminder & partner alert |

---

## 6. Architecture & Product Design Targets

| Problem Observed in Data | Empirical Reality | Solution Implemented in Udyam Digital | Target Metric |
|---|---|---|---|
| **Slow manual quoting** | 1,113 drops at Needs Assessed | Instant conversational advisor with bundle generator | Quote time: 3 days → **< 30 seconds** |
| **Manual paper KYC** | 273 drops at Quote Accepted | Mock GSTIN/Udyam registry API lookup + Gemini Vision OCR | KYC completion: 68% → **> 90%** |
| **Blind installation wait** | 3 status chases & 98 cancellations | Self-serve real-time timeline tracker with expected dates | Status chases: 3.0 → **< 0.5** |
| **High customer acquisition cost** | ₹15,053 blended CAC | Direct digital self-serve + automated channel partner assist | Blended CAC: ₹15k → **< ₹6,000** |
| **Lead-to-activation cycle** | 17.6 average days | Instant quote + instant KYC + automated provisioning dispatch | Lead-to-active: 17.6d → **< 5 days** |

---
*Report generated automatically for Project Udyam Digital submission pack.*