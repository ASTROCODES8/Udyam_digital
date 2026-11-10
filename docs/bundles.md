# Segment-Default Bundles Specification — Project Udyam Digital

This document specifies the default bundle templates and pricing rules implemented in `lib/rules/bundles.ts` and `lib/rules/pricing.ts` for Accel Business / Project Udyam Digital.

---

## 1. Segment Overview & Strategy Matrix

Based on empirical evidence from 5,000 SMB leads in `smb_leads.csv`, each segment has distinct price elasticity, technical readiness, and basket needs:

| Segment | Share of Leads | Baseline Activation | Median Spend | Price Multiplier | Core Value Driver |
|---|---|---|---|---|---|
| **Micro Retail & Services** (`micro`) | 54.2% | 4.06% | ₹2,470 / mo | **Min end (0%)** | Zero-touch, lowest monthly cost, zero paperwork friction |
| **Professional Offices** (`prof`) | 24.9% | 11.07% | ₹6,575 / mo | **~35% margin** | Fast reliable fibre, business domain email, IVR telephony |
| **Small Multi-Site** (`multi`) | 15.1% | 10.99% | ₹28,080 / mo | **~60% margin** | Unified inter-site SD-WAN, automatic failover, centralized Wi-Fi |
| **Small Manufacturers** (`mfg`) | 5.8% | 12.80% | ₹15,910 / mo | **~70% margin** | 99.5%+ SLA Leased Line, IoT machine monitoring, GPS fleet trackers |

---

## 2. Segment Bundle Templates

### A. Micro Digital Starter Pack (`micro`)
- **Target Customer:** Kirana stores, bakeries, standalone pharmacies, local dry cleaners.
- **Goal:** Get them online with broadband and billing in one sitting without requiring GST registration.
- **Price Sensitivity:** High (wants predictable bills under ₹2,500/month).

| Product ID | Product Name | Default Qty | Unit Price (Micro) | Setup Fee | Why Included |
|---|---|---|---|---|---|
| `P01` | **Biz Fibre 100** | 1 site | ₹999 / mo | ₹0 | Unlimited 100 Mbps broadband for shop operations & UPI payment terminals |
| `P07` | **Business Postpaid 299** | 2 lines | ₹299 / mo | ₹0 | Owner and delivery/store manager SIM with 50 GB data |
| `P19` | **Cloud POS & Billing** | 1 counter | ₹599 / mo | ₹2,500 | GST-ready tablet billing, inventory sync, and digital receipts |
| `P18` | **Website + Domain Starter** | 1 account | ₹299 / mo | ₹0 | Google Maps link, domain, and 5-page digital storefront |

- **Subtotal Monthly:** ₹2,196 / mo (+ 18% GST: ₹395) = **₹2,591 / mo**
- **One-time Setup:** ₹2,500
- **Contract Commitment:** 12 months
- **GST Requirement:** None (100% accessible to non-GST businesses)
- **Fallback Rule:** If fibre (`P01`) is unavailable in the area, automatically falls back to **Biz 5G AirFiber 100 (`P04`)** at ₹899/mo (instant plug-and-play).

---

### B. Professional Practice Pack (`prof`)
- **Target Customer:** Dental clinics, diagnostic labs, chartered accountant (CA) firms, legal chambers, coaching institutes.
- **Goal:** Establish credibility, client call routing, and data security.
- **Price Sensitivity:** Moderate (willing to pay for uptime and professional image).

| Product ID | Product Name | Default Qty | Unit Price (Prof @ 35%) | Setup Fee | Why Included |
|---|---|---|---|---|---|
| `P02` | **Biz Fibre 300** | 1 site | ₹1,604 / mo | ₹0 | 300 Mbps high-throughput broadband for video calls & cloud files |
| `P07` | **Business Postpaid 299** | 3 lines | ₹334 / mo | ₹0 | Staff postpaid SIMs with pooled company data |
| `P12` | **Cloud Telephony / SIP** | 1 channel | ₹1,175 / mo | ₹2,000 | Professional IVR greeting ("Welcome to Dr. Sharma Clinic") and call recording |
| `P16` | **Cloud Email & Office Suite** | 5 users | ₹134 / mo | ₹0 | Branded domain emails (`name@clinic.in`) and 30 GB cloud storage |
| `P22` | **Secure Wi-Fi (Guest Net)** | 1 site | ₹469 / mo | ₹1,000 | Separate isolated Wi-Fi network for waiting room patients/clients |

- **Subtotal Monthly:** ₹4,920 / mo (+ 18% GST: ₹886) = **₹5,806 / mo**
- **One-time Setup:** ₹3,000
- **Contract Commitment:** 12 months

---

### C. Multi-Site Retail & Branch Pack (`multi`)
- **Target Customer:** Quick-service restaurant chains, retail store chains (3–10 outlets), diagnostic lab chains.
- **Goal:** Interconnect all branch locations with zero downtime and cloud visibility.
- **Price Sensitivity:** Low (downtime at any outlet directly costs revenue).

| Product ID | Product Name | Default Qty | Unit Price (Multi @ 60%) | Setup Fee | Why Included |
|---|---|---|---|---|---|
| `P02` | **Biz Fibre 300** | `num_sites` | ₹1,679 / site | ₹0 | Primary high-speed link at every branch |
| `P09` | **Backup 4G/5G Failover** | `num_sites` | ₹559 / site | ₹1,500 / site | Auto-switch router keeps card/UPI billing active when main fibre cuts |
| `P10` | **Managed SD-WAN** | `num_sites` | ₹3,100 / site | ₹5,000 / site | Central dashboard to view network health across all retail branches |
| `P22` | **Secure Wi-Fi** | `num_sites` | ₹519 / site | ₹1,000 / site | Store guest Wi-Fi and POS terminal network separation |
| `P08` | **Business Postpaid 599** | 5 lines | ₹719 / line | ₹0 | Store managers' priority roaming lines |

- **Subtotal Monthly (for 3 sites):** ₹21,161 / mo (+ 18% GST: ₹3,809) = **₹24,970 / mo**
- **One-time Setup:** ₹22,500
- **Contract Commitment:** 24 months (dictated by SD-WAN minimum duration)

---

### D. Connected Factory & Operations Pack (`mfg`)
- **Target Customer:** Auto-component makers, CNC machining workshops, textile units, packaging plants.
- **Goal:** Guaranteed enterprise uptime, remote machine monitoring, and delivery fleet visibility.
- **Price Sensitivity:** Value-focused (ROI driven by machine uptime and logistics tracking).

| Product ID | Product Name | Default Qty | Unit Price (Mfg @ 70%) | Setup Fee | Why Included |
|---|---|---|---|---|---|
| `P05` | **Internet Leased Line 20** | 1 site | ₹10,800 / mo | ₹10,000 | Dedicated 1:1 symmetrical bandwidth with 99.5% uptime SLA |
| `P09` | **Backup 4G/5G Failover** | 1 site | ₹569 / mo | ₹1,500 | Automatic wireless redundancy for uninterrupted ERP connectivity |
| `P21` | **Managed Firewall** | 1 site | ₹2,699 / mo | ₹4,000 | Next-gen edge firewall protecting factory OT networks from ransomware |
| `P24` | **Machine Monitoring IoT** | 5 devices | ₹219 / device | ₹3,000 / dev | Real-time sensor kit monitoring power consumption & machine runtime |
| `P25` | **Fleet Tracker** | 2 vehicles | ₹269 / tracker | ₹1,500 / veh | GPS tracking and driver behaviour for supply dispatch vehicles |
| `P20` | **Endpoint Security** | 10 devices | ₹134 / device | ₹0 | Antivirus protection for office PCs and plant terminals |

- **Subtotal Monthly:** ₹17,040 / mo (+ 18% GST: ₹3,067) = **₹20,107 / mo**
- **One-time Setup:** ₹33,500
- **Contract Commitment:** 24 months (dictated by Leased Line / Firewall / IoT term)

---

## 3. Dependency & Auto-Add Rules

A major source of onboarding drops in the historical data was **dependency rejection** (e.g. customer orders Cloud CCTV or Failover without realizing it requires broadband).

The rules engine handles this deterministically:
1. When a user selects a product that has a `requires_one_of` constraint (e.g. `P23 Cloud CCTV`, `P09 Failover`, `P12 Cloud Telephony`, `P22 Secure Wi-Fi`):
2. If the bundle already contains any one of the required connectivity items (`P01`, `P02`, `P03`, `P04`, `P05`, `P06`), the check passes.
3. If no connectivity product is in the bundle, `buildQuote()` **automatically adds the best qualifying base link** (`P01 Biz Fibre 100` or `P04 5G AirFiber`) and emits a clear customer-facing warning.
4. The user never gets blocked by technical dependency errors.
