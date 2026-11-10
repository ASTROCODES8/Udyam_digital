# Udyam Digital

**A phone-first journey that lets a small business owner discover the right telecom bundle, buy it, verify KYC and track activation in one sitting, with no sales visit.**

Built for the Accel YTL Hackathon 2026 (Enterprise Track A, *Project Udyam Digital*). It uses a fictional operator, Accel Telecom, and its B2B arm, Accel Business. All businesses, people, identifiers and documents in this repo are **synthetic**.

> Add a screenshot or GIF of the advisor and KYC screens here: `docs/screenshots/`
> Demo video: _add link_

---

## The problem

Only **7.4%** of small-business leads (368 of 5,000) become customers. Activation takes **17.6 days**, customers chase status **3 times**, and acquisition costs about **₹15,000** per customer. Needs are discovered on a field visit, quotes take days and come as PDFs full of product codes, and KYC is collected on paper.

## What it does

| Stage | What the owner sees |
|---|---|
| **1. Advisor** | A chat (Hindi, English and other Indian languages) that asks a few plain questions and recommends a bundle with a clear monthly price and reasons |
| **2. Quote & checkout** | One transparent price with add-ons that can be toggled. Invalid combinations (for example CCTV with no internet) are blocked |
| **3. Smart KYC** | DPDP consent first, then GSTIN and Udyam lookups that auto-fill details, document OCR, cross-checks, and e-sign |
| **4. Tracker** | A live order timeline with expected dates per product, so the owner doesn't need to call support |

## Design decisions

- **The LLM never decides price or eligibility.** Gemini asks questions and explains the recommendation. A deterministic TypeScript rules engine (`src/lib/rules`) decides what a business may buy and what it costs. The advisor must call the `build_quote` tool for any number it states, so it can't invent a price or sell an ineligible product.
- **Lookup first, upload last.** KYC starts with a GSTIN or Udyam number and asks for documents only for what the lookup can't prove. This minimises data collected, and the lead data shows leads with a GSTIN activate at about 9.6% against 2.0% without.
- **Graceful failure.** If Gemini times out or hits a quota, the app falls back to a second model and then to a scripted advisor flow. OCR falls back to stored extractions for the specimen documents.

## Smart KYC checks

| Check | Example it catches |
|---|---|
| GSTIN format and mod-36 checksum | A certificate with one digit altered |
| GSTIN registry status | Cancelled or suspended registrations |
| Name match against the registry | Certificate name differs from the registered name |
| Udyam number present and valid | Blank Udyam number on a certificate |
| Address proof age (90 days) | A bill that is several months old |
| Signatory match | ID holder differs from the authorised contact |
| Completeness | A required document is missing |
| Image quality | A blurred or slanted photo gets a "please re-upload" request, not a rejection |

Identifiers are masked (first 2 and last 3 characters) in the UI and logs.

## Architecture

```
Browser (Next.js, mobile-first)
   │
   ├── /            Advisor chat ──► /api/advisor ──► Gemini (function calling)
   │                                                    ├─ lookup_gstin
   │                                                    ├─ check_eligibility ─┐
   │                                                    └─ build_quote ───────┤
   ├── /quote       Quote + add-ons ─► /api/quote ───────────────────────────► Rules engine
   │                                                                          (eligibility, pricing, bundles)
   ├── /kyc         Consent → GSTIN → Udyam → Documents → Review → e-Sign
   │                    ├─ /api/gstin, /api/udyam   (mock registries)
   │                    ├─ /api/kyc/extract         (Gemini Vision OCR, stored fallback)
   │                    └─ /api/kyc/validate        (cross-checks)
   └── /track/[id]  Order timeline ◄─ /api/orders ──► SQLite (Prisma)
```

## Tech stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma with SQLite, Google Gemini API (`@google/generative-ai`), Vitest, Playwright.

## Getting started

Requires Node.js 20 or newer.

```bash
git clone https://github.com/ASTROCODES8/Udyam_digital.git
cd Udyam_digital
npm install

cp .env.example .env          # on Windows: copy .env.example .env
# edit .env and set GEMINI_API_KEY

npx prisma db push            # create the SQLite database
npm run seed                  # load catalogue, leads and mock registries
npm run dev                   # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file, default `file:./dev.db` |
| `GEMINI_API_KEY` | Gemini API key (never commit `.env`) |
| `GEMINI_MODEL` | Primary model |
| `GEMINI_FALLBACK_MODEL` | Used if the primary model fails or hits quota |

Without a key, the app still runs using the scripted advisor and stored OCR results.

## Tests

```bash
npm test                      # unit tests: rules engine, KYC validators, specimen matrix, tracker
node scripts/run_e2e_playwright.mjs   # end-to-end happy path and a KYC failure path
```

## Trying it out

- **Demo personas** on the home page prefill the advisor.
- **KYC specimens `K01`–`K12`** (in `public/specimens`) are 12 synthetic applicants. Four are clean and the rest carry deliberate defects. Load one in the KYC step to see each check fire.
- **Reference date:** the app treats **2026-07-15** as "today" (`src/lib/time.ts`), as the case requires, so the 90-day address proof check is reproducible.
- **Mock OTP:** `123456`.
- **Tracker demo controls:** open an order with `?demo=1` to advance it stage by stage.

## Project structure

```
src/app/          pages (advisor, quote, kyc, track) and API routes
src/lib/rules/    eligibility, pricing, bundles (deterministic)
src/lib/llm/      Gemini orchestration, prompts, tools, scripted fallback
src/lib/kyc/      GSTIN checksum, Udyam, OCR extraction, validators
prisma/           schema and seed script
data/             synthetic catalogue, leads and mock registries
docs/             bundle design, lead analysis, KYC results
content/          DPDP consent notice (English and Hindi)
tests/            unit and end-to-end tests
```

## Privacy and data handling

- Consent is shown and logged **before** any KYC data is collected (`content/consent.md`).
- Data minimisation: only the fields needed for verification are extracted and kept.
- Identifiers are masked in the UI and logs.
- Uploaded documents carry a deletion date (30 days after activation) and a purge script (`scripts/purge_uploads.ts`).

## Limitations (prototype)

This is a hackathon prototype, not production software.

- The GSTIN and Udyam lookups, OTP, e-sign and payment mandate are **mocked**.
- OCR uses Gemini Vision when a key is present, with stored results as a fallback for the specimen documents.
- There is no real WhatsApp or DigiLocker integration, no authentication beyond the mock OTP, and no deployment-grade database.

## Roadmap

- Back-office view for leads the advisor couldn't close, with partner and field-force assignment
- Lead propensity score trained on the historical leads
- WhatsApp and voice front end
- Real registry, DigiLocker and e-sign integrations

## Data

The product catalogue, leads, registries and specimen documents are the synthetic dataset provided for the hackathon. Nothing in this repo describes a real company or person.
