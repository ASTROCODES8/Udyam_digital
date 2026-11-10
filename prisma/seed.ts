import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ─── CSV Parser ──────────────────────────────────────────────
// Handles quoted fields with commas, newlines, and escaped quotes
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n") {
        current.push(field);
        field = "";
        if (current.length > 1 || current[0] !== "") {
          rows.push(current);
        }
        current = [];
      } else if (ch === "\r") {
        // ignore carriage return
      } else {
        field += ch;
      }
    }
  }

  if (field || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] ?? "").trim();
    });
    return obj;
  });
}

function readCsv(filename: string): Record<string, string>[] {
  const filePath = path.resolve(__dirname, "..", "data", filename);
  const text = fs.readFileSync(filePath, "utf-8");
  return parseCsv(text);
}

// ─── Helpers ─────────────────────────────────────────────────
function toBool(val: string): boolean {
  return val === "Y" || val === "Yes" || val === "TRUE" || val === "true" || val === "1";
}

function toIntOrNull(val: string): number | null {
  if (!val || val === "") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function toFloatOrNull(val: string): number | null {
  if (!val || val === "") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function toBoolOrNull(val: string): boolean | null {
  if (!val || val === "") return null;
  return toBool(val);
}

// ─── 1. Seed Products ─────────────────────────────────────────
async function seedProducts() {
  const rows = readCsv("product_catalogue.csv");
  console.log(`📦 Seeding products... (${rows.length} rows)`);

  for (const r of rows) {
    // Parse eligibility fields:
    // 1. city tiers as int[]
    const cityTiers: number[] = r["available_city_tiers"]
      ? r["available_city_tiers"]
          .split(";")
          .map((t) => parseInt(t.trim(), 10))
          .filter((n) => !isNaN(n))
      : [];

    // 2. requires_one_of as string[]
    const requiresOneOf: string[] = r["requires_one_of"]
      ? r["requires_one_of"]
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // 3. target_segments as string[]
    const targetSegments: string[] = r["target_segments"]
      ? r["target_segments"]
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    await prisma.product.upsert({
      where: { id: r["product_id"] },
      update: {
        category: r["category"],
        productName: r["product_name"],
        description: r["description"],
        unit: r["unit"],
        priceMinInr: parseInt(r["price_min_inr_per_month"], 10),
        priceMaxInr: parseInt(r["price_max_inr_per_month"], 10),
        oneTimeSetupInr: parseInt(r["one_time_setup_inr"], 10),
        minContractMonths: parseInt(r["min_contract_months"], 10),
        availableCityTiers: JSON.stringify(cityTiers),
        minEmployees: parseInt(r["min_employees"], 10),
        minSites: parseInt(r["min_sites"], 10),
        requiresGstin: toBool(r["requires_gstin"]),
        requiresOneOf: JSON.stringify(requiresOneOf),
        typicalInstallDays: parseInt(r["typical_install_days"], 10),
        targetSegments: JSON.stringify(targetSegments),
      },
      create: {
        id: r["product_id"],
        category: r["category"],
        productName: r["product_name"],
        description: r["description"],
        unit: r["unit"],
        priceMinInr: parseInt(r["price_min_inr_per_month"], 10),
        priceMaxInr: parseInt(r["price_max_inr_per_month"], 10),
        oneTimeSetupInr: parseInt(r["one_time_setup_inr"], 10),
        minContractMonths: parseInt(r["min_contract_months"], 10),
        availableCityTiers: JSON.stringify(cityTiers),
        minEmployees: parseInt(r["min_employees"], 10),
        minSites: parseInt(r["min_sites"], 10),
        requiresGstin: toBool(r["requires_gstin"]),
        requiresOneOf: JSON.stringify(requiresOneOf),
        typicalInstallDays: parseInt(r["typical_install_days"], 10),
        targetSegments: JSON.stringify(targetSegments),
      },
    });
  }
  console.log("   ✓ Products loaded successfully.");
}

// ─── 2. Seed Mock GSTIN Registry ─────────────────────────────
async function seedGstinRecords() {
  const rows = readCsv("mock_gstin_registry.csv");
  console.log(`🏛️  Seeding GSTIN registry... (${rows.length} rows)`);

  // Batch insert in chunks of 500 for fast SQLite loading
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await prisma.$transaction(
      chunk.map((r) =>
        prisma.gstinRecord.upsert({
          where: { gstin: r["gstin"] },
          update: {
            legalName: r["legal_name"],
            tradeName: r["trade_name"] || "",
            constitution: r["constitution"] || "",
            principalPlaceOfBusiness: r["principal_place_of_business"] || "",
            state: r["state"],
            registrationDate: r["registration_date"],
            status: r["status"],
          },
          create: {
            gstin: r["gstin"],
            legalName: r["legal_name"],
            tradeName: r["trade_name"] || "",
            constitution: r["constitution"] || "",
            principalPlaceOfBusiness: r["principal_place_of_business"] || "",
            state: r["state"],
            registrationDate: r["registration_date"],
            status: r["status"],
          },
        })
      )
    );
  }
  console.log("   ✓ GSTIN registry loaded.");
}

// ─── 3. Seed Mock Udyam Registry ─────────────────────────────
async function seedUdyamRecords() {
  const rows = readCsv("mock_udyam_registry.csv");
  console.log(`📜 Seeding Udyam registry... (${rows.length} rows)`);

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await prisma.$transaction(
      chunk.map((r) =>
        prisma.udyamRecord.upsert({
          where: { udyamNumber: r["udyam_number"] },
          update: {
            enterpriseName: r["enterprise_name"],
            enterpriseType: r["enterprise_type"] || "",
            majorActivity: r["major_activity"] || "",
            nicDescription: r["nic_description"] || "",
            state: r["state"],
            city: r["city"],
            dateOfRegistration: r["date_of_registration"],
          },
          create: {
            udyamNumber: r["udyam_number"],
            enterpriseName: r["enterprise_name"],
            enterpriseType: r["enterprise_type"] || "",
            majorActivity: r["major_activity"] || "",
            nicDescription: r["nic_description"] || "",
            state: r["state"],
            city: r["city"],
            dateOfRegistration: r["date_of_registration"],
          },
        })
      )
    );
  }
  console.log("   ✓ Udyam registry loaded.");
}

// ─── 4. Seed SMB Leads ───────────────────────────────────────
async function seedLeads() {
  const rows = readCsv("smb_leads.csv");
  console.log(`👥 Seeding SMB leads... (${rows.length} rows)`);

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await prisma.$transaction(
      chunk.map((r) =>
        prisma.lead.upsert({
          where: { leadId: r["lead_id"] },
          update: {
            createdDate: r["created_date"],
            leadSource: r["lead_source"],
            businessName: r["business_name"],
            businessType: r["business_type"],
            segment: r["segment"],
            city: r["city"],
            cityTier: parseInt(r["city_tier"], 10),
            state: r["state"],
            preferredLanguage: r["preferred_language"],
            employeeCount: parseInt(r["employee_count"], 10),
            numSites: parseInt(r["num_sites"], 10),
            annualTurnoverBand: r["annual_turnover_band"],
            hasGstin: toBool(r["has_gstin"]),
            gstin: r["gstin"] || "",
            hasUdyam: toBool(r["has_udyam"]),
            udyamNumber: r["udyam_number"] || "",
            currentInternet: r["current_internet"],
            currentProvider: r["current_provider"] || "",
            monthlyTelecomSpendInr: parseInt(r["monthly_telecom_spend_inr"], 10),
            productsOfInterest: r["products_of_interest"],
            contactName: r["contact_name"],
            contactRole: r["contact_role"],
            stageReached: r["stage_reached"],
            outcome: r["outcome"],
            dropReason: r["drop_reason"] || "",
            contactedDate: r["contacted_date"] || "",
            needsAssessedDate: r["needs_assessed_date"] || "",
            quoteAcceptedDate: r["quote_accepted_date"] || "",
            kycCompleteDate: r["kyc_complete_date"] || "",
            activatedDate: r["activated_date"] || "",
            daysLeadToActivation: toIntOrNull(r["days_lead_to_activation"]),
            customerFollowUpCalls: parseInt(r["customer_follow_up_calls"] || "0", 10),
            bundleProducts: r["bundle_products"] || "",
            monthlyBundleValueInr: toFloatOrNull(r["monthly_bundle_value_inr"]),
            oneTimeSetupInr: toFloatOrNull(r["one_time_setup_inr"]),
            contractMonths: toIntOrNull(r["contract_months"]),
            churnedWithin6Months: toBoolOrNull(r["churned_within_6_months"]),
            npsScore: toIntOrNull(r["nps_score"]),
            acquisitionCostInr: toFloatOrNull(r["acquisition_cost_inr"]),
          },
          create: {
            leadId: r["lead_id"],
            createdDate: r["created_date"],
            leadSource: r["lead_source"],
            businessName: r["business_name"],
            businessType: r["business_type"],
            segment: r["segment"],
            city: r["city"],
            cityTier: parseInt(r["city_tier"], 10),
            state: r["state"],
            preferredLanguage: r["preferred_language"],
            employeeCount: parseInt(r["employee_count"], 10),
            numSites: parseInt(r["num_sites"], 10),
            annualTurnoverBand: r["annual_turnover_band"],
            hasGstin: toBool(r["has_gstin"]),
            gstin: r["gstin"] || "",
            hasUdyam: toBool(r["has_udyam"]),
            udyamNumber: r["udyam_number"] || "",
            currentInternet: r["current_internet"],
            currentProvider: r["current_provider"] || "",
            monthlyTelecomSpendInr: parseInt(r["monthly_telecom_spend_inr"], 10),
            productsOfInterest: r["products_of_interest"],
            contactName: r["contact_name"],
            contactRole: r["contact_role"],
            stageReached: r["stage_reached"],
            outcome: r["outcome"],
            dropReason: r["drop_reason"] || "",
            contactedDate: r["contacted_date"] || "",
            needsAssessedDate: r["needs_assessed_date"] || "",
            quoteAcceptedDate: r["quote_accepted_date"] || "",
            kycCompleteDate: r["kyc_complete_date"] || "",
            activatedDate: r["activated_date"] || "",
            daysLeadToActivation: toIntOrNull(r["days_lead_to_activation"]),
            customerFollowUpCalls: parseInt(r["customer_follow_up_calls"] || "0", 10),
            bundleProducts: r["bundle_products"] || "",
            monthlyBundleValueInr: toFloatOrNull(r["monthly_bundle_value_inr"]),
            oneTimeSetupInr: toFloatOrNull(r["one_time_setup_inr"]),
            contractMonths: toIntOrNull(r["contract_months"]),
            churnedWithin6Months: toBoolOrNull(r["churned_within_6_months"]),
            npsScore: toIntOrNull(r["nps_score"]),
            acquisitionCostInr: toFloatOrNull(r["acquisition_cost_inr"]),
          },
        })
      )
    );
  }
  console.log("   ✓ SMB leads loaded.");
}

// ─── 5. Seed Initial Sample Orders & KYC Cases ──────────────
async function seedInitialOrders() {
  console.log("📦 Seeding demo orders, events, and KYC cases...");

  // Sample Order 1: Saffron Bakers (ACTIVATED)
  const order1 = await prisma.order.upsert({
    where: { id: "ORD-0001" },
    update: {},
    create: {
      id: "ORD-0001",
      leadId: "L00002",
      businessName: "Saffron Bakers",
      contactName: "Sneha Rao",
      contactPhone: "+91-98765-00001",
      contactEmail: "sneha@saffronbakers.in",
      city: "Ludhiana",
      state: "Punjab",
      bundleProducts: JSON.stringify([
        { productId: "P01", productName: "Biz Fibre 100", quantity: 1, monthlyPrice: 999, setupFee: 0 },
        { productId: "P07", productName: "Business Postpaid 299", quantity: 2, monthlyPrice: 299, setupFee: 0 },
        { productId: "P19", productName: "Cloud POS & Billing", quantity: 1, monthlyPrice: 599, setupFee: 2500 },
      ]),
      monthlyTotal: 2197,
      setupTotal: 2500,
      contractMonths: 12,
      status: "ACTIVE",
      kycStatus: "VERIFIED",
      expectedActivationDate: "2026-05-30",
      actualActivationDate: "2026-05-31",
      notes: "Fully onboarded via self-serve digital journey.",
    },
  });

  // Events for Order 1
  await prisma.orderEvent.createMany({
    data: [
      {
        orderId: order1.id,
        status: "QUOTE_ACCEPTED",
        title: "Quote Accepted",
        description: "Custom bundle selected: Biz Fibre 100 + 2 Business Postpaid + Cloud POS.",
        timestamp: new Date("2026-05-24T10:00:00Z"),
        completed: true,
      },
      {
        orderId: order1.id,
        status: "KYC_VERIFIED",
        title: "Smart KYC Verified",
        description: "GSTIN 03PJNXS4821G1ZB verified instantly via registry. Signatory Aadhaar validated.",
        timestamp: new Date("2026-05-26T14:30:00Z"),
        completed: true,
      },
      {
        orderId: order1.id,
        status: "INSTALLATION_SCHEDULED",
        title: "Installation Scheduled",
        description: "Field technician assigned for broadband connection and POS terminal setup.",
        timestamp: new Date("2026-05-28T09:00:00Z"),
        completed: true,
      },
      {
        orderId: order1.id,
        status: "ACTIVE",
        title: "Service Activated",
        description: "All services successfully provisioned and active.",
        timestamp: new Date("2026-05-31T16:00:00Z"),
        completed: true,
      },
    ],
  });

  // KYC Case for Order 1
  await prisma.kycCase.upsert({
    where: { orderId: order1.id },
    update: {},
    create: {
      orderId: order1.id,
      businessName: "Saffron Bakers",
      hasGstin: true,
      gstin: "03PJNXS4821G1ZB",
      gstinStatus: "VALID",
      gstinData: JSON.stringify({
        legalName: "Sneha Rao",
        tradeName: "Saffron Bakers",
        status: "Active",
        state: "Punjab",
      }),
      hasUdyam: false,
      signatoryName: "Sneha Rao",
      signatoryIdType: "AADHAAR",
      signatoryIdStatus: "VALID",
      addressProofType: "ELECTRICITY_BILL",
      addressProofDate: "2026-05-10",
      addressProofStatus: "VALID",
      overallStatus: "VERIFIED",
    },
  });

  // Consent Log for Order 1 (DPDP Act)
  await prisma.consentLog.create({
    data: {
      orderId: order1.id,
      phone: "+91-98765-00001",
      consentType: "KYC_VERIFICATION",
      purpose:
        "Verification of business registration and signatory identity under Telecommunications regulations & DPDP Act 2023.",
      granted: true,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Mobile; Android 14)",
      timestamp: new Date("2026-05-24T10:05:00Z"),
    },
  });

  // Sample Order 2: Balaji Dental Care LLP (INSTALLING)
  const order2 = await prisma.order.upsert({
    where: { id: "ORD-0002" },
    update: {},
    create: {
      id: "ORD-0002",
      leadId: "L00001",
      businessName: "Balaji Dental Care LLP",
      contactName: "Prakash Shah",
      contactPhone: "+91-98765-00002",
      contactEmail: "prakash@balajidentalcare.in",
      city: "Kochi",
      state: "Kerala",
      bundleProducts: JSON.stringify([
        { productId: "P02", productName: "Biz Fibre 300", quantity: 1, monthlyPrice: 1499, setupFee: 0 },
        { productId: "P12", productName: "Cloud Telephony / SIP", quantity: 1, monthlyPrice: 1000, setupFee: 2000 },
      ]),
      monthlyTotal: 2499,
      setupTotal: 2000,
      contractMonths: 12,
      status: "INSTALLING",
      kycStatus: "VERIFIED",
      expectedActivationDate: "2026-06-18",
      actualActivationDate: null,
      notes: "Installation underway. Fibre line strung, router configuration pending.",
    },
  });

  await prisma.orderEvent.createMany({
    data: [
      {
        orderId: order2.id,
        status: "QUOTE_ACCEPTED",
        title: "Quote Accepted",
        description: "Professional clinic bundle: Biz Fibre 300 + Cloud Telephony IVR.",
        timestamp: new Date("2026-06-10T11:00:00Z"),
        completed: true,
      },
      {
        orderId: order2.id,
        status: "KYC_VERIFIED",
        title: "Smart KYC Verified",
        description: "GSTIN 32TTNXB7384T1ZW and Udyam UDYAM-KL-00-3078801 verified.",
        timestamp: new Date("2026-06-11T12:00:00Z"),
        completed: true,
      },
      {
        orderId: order2.id,
        status: "INSTALLATION_SCHEDULED",
        title: "Installation In Progress",
        description: "Technician visiting site for fibre termination.",
        timestamp: new Date("2026-06-14T09:30:00Z"),
        completed: true,
      },
    ],
  });

  console.log("   ✓ Sample orders & events seeded.");
}

// ─── 6. Seed Specimen Registry Records (K01-K12) ───────────────────
async function seedSpecimens() {
  console.log("📑 Seeding KYC specimen registry entries (K01-K12)...");

  const specimenGstins = [
    { gstin: "32TTNXB7384T1ZW", legalName: "Balaji Dental Care LLP", tradeName: "Balaji Dental Care", constitution: "Limited Liability Partnership", state: "Kerala", status: "Cancelled", registrationDate: "2020-06-04", principalPlaceOfBusiness: "Shop/Unit 164, Station Road, Kochi, Kerala - 289398" },
    { gstin: "03PJNXS4821G1ZB", legalName: "Sneha Rao (Prop. Saffron Bakers)", tradeName: "Saffron Bakers", constitution: "Proprietorship", state: "Punjab", status: "Active", registrationDate: "2019-04-15", principalPlaceOfBusiness: "Shop/Unit 83, Market Yard, Ludhiana, Punjab - 416059" },
    { gstin: "33MFTXS9954Q1Z9", legalName: "Joseph Joshi (Prop. Star Electronics)", tradeName: "Star Electronics", constitution: "Proprietorship", state: "Tamil Nadu", status: "Active", registrationDate: "2018-09-12", principalPlaceOfBusiness: "Shop/Unit 4, Lake View Colony, Chennai, Tamil Nadu - 304733" },
    { gstin: "27QTBXZ1995X1Z9", legalName: "Harpreet Bhat (Prop. Zenith Diagnostics)", tradeName: "Zenith Diagnostics", constitution: "Proprietorship", state: "Maharashtra", status: "Active", registrationDate: "2021-03-20", principalPlaceOfBusiness: "Shop/Unit 11, MG Road, Nagpur, Maharashtra - 653100" },
    { gstin: "32AITXR9985H1ZT", legalName: "Vikram Bhat (Prop. Royal Fashions)", tradeName: "Royal Fashions", constitution: "Proprietorship", state: "Kerala", status: "Active", registrationDate: "2023-08-05", principalPlaceOfBusiness: "Unit 22, Commercial Complex, Kochi, Kerala - 682001" },
    { gstin: "29AABCU9603R1ZM", legalName: "Royal Fashions Pvt Ltd", tradeName: "Royal Fashions", constitution: "Private Limited", state: "Karnataka", status: "Active", registrationDate: "2022-01-10", principalPlaceOfBusiness: "Brigade Road, Bengaluru, Karnataka - 560001" },
    { gstin: "06ABCXD5189E1ZH", legalName: "Patel Hardware Store", tradeName: "Patel Hardware", constitution: "Proprietorship", state: "Haryana", status: "Active", registrationDate: "2020-11-15", principalPlaceOfBusiness: "45, Industrial Area, Faridabad, Haryana - 121001" },
    { gstin: "06ABCXD1234E1ZH", legalName: "Patel Hardware Store", tradeName: "Patel Hardware", constitution: "Proprietorship", state: "Haryana", status: "Active", registrationDate: "2020-11-15", principalPlaceOfBusiness: "45, Industrial Area, Faridabad, Haryana - 121001" },
    { gstin: "09BNZXK5678L1ZQ", legalName: "Neelgiri Physio Clinic", tradeName: "Neelgiri Physio Clinic", constitution: "Proprietorship", state: "Uttar Pradesh", status: "Active", registrationDate: "2021-07-22", principalPlaceOfBusiness: "Plot 12, Sector 5, Lucknow, Uttar Pradesh - 226001" },
    { gstin: "29FCHXS7993K1ZW", legalName: "Sunrise Packaging", tradeName: "Sunrise Packaging", constitution: "Proprietorship", state: "Karnataka", status: "Active", registrationDate: "2024-04-05", principalPlaceOfBusiness: "Mysuru, Karnataka" },
    { gstin: "19CDEXF2345G1ZP", legalName: "Bengal Sweets & Snacks", tradeName: "Bengal Sweets", constitution: "Proprietorship", state: "West Bengal", status: "Active", registrationDate: "2019-12-01", principalPlaceOfBusiness: "78, Park Street, Kolkata, West Bengal - 700016" },
    { gstin: "24EFGXH3456I1ZN", legalName: "Ahmedabad Auto Parts", tradeName: "Ahmedabad Auto Parts", constitution: "Partnership", state: "Gujarat", status: "Active", registrationDate: "2020-08-18", principalPlaceOfBusiness: "Unit 3, GIDC Estate, Ahmedabad, Gujarat - 382445" },
    { gstin: "29GHIXJ4567K1ZL", legalName: "Bangalore Coffee House", tradeName: "Bangalore Coffee House", constitution: "Partnership", state: "Karnataka", status: "Active", registrationDate: "2017-05-30", principalPlaceOfBusiness: "12, Brigade Road, Bengaluru, Karnataka - 560001" },
    { gstin: "36IJKXL5678M1ZJ", legalName: "Telangana Pharma Distributors", tradeName: "Telangana Pharma", constitution: "Private Limited", state: "Telangana", status: "Active", registrationDate: "2021-09-09", principalPlaceOfBusiness: "Jubilee Hills, Hyderabad, Telangana - 500033" },
    { gstin: "08KLMXN6789O1ZG", legalName: "Rajasthan Handicrafts Emporium", tradeName: "Rajasthan Handicrafts", constitution: "Proprietorship", state: "Rajasthan", status: "Active", registrationDate: "2018-02-14", principalPlaceOfBusiness: "Hawa Mahal Road, Jaipur, Rajasthan - 302002" },
  ];

  for (const g of specimenGstins) {
    await prisma.gstinRecord.upsert({
      where: { gstin: g.gstin },
      update: g,
      create: g,
    });
  }

  const specimenUdyams = [
    { udyamNumber: "UDYAM-KL-00-3078801", enterpriseName: "Balaji Dental Care LLP", enterpriseType: "Micro", majorActivity: "Services", nicDescription: "Dental clinic", state: "Kerala", city: "Kochi", dateOfRegistration: "2020-07-01" },
    { udyamNumber: "UDYAM-PB-00-4421903", enterpriseName: "Saffron Bakers", enterpriseType: "Micro", majorActivity: "Trading", nicDescription: "Bakery and confectionary", state: "Punjab", city: "Ludhiana", dateOfRegistration: "2019-05-10" },
    { udyamNumber: "UDYAM-TN-00-3866196", enterpriseName: "Star Electronics", enterpriseType: "Micro", majorActivity: "Trading", nicDescription: "Electronics and appliances", state: "Tamil Nadu", city: "Chennai", dateOfRegistration: "2018-10-15" },
    { udyamNumber: "UDYAM-MH-00-7656096", enterpriseName: "Zenith Diagnostics", enterpriseType: "Micro", majorActivity: "Services", nicDescription: "Diagnostic pathology lab", state: "Maharashtra", city: "Nagpur", dateOfRegistration: "2021-04-12" },
    { udyamNumber: "UDYAM-KL-00-2007485", enterpriseName: "Royal Fashions", enterpriseType: "Micro", majorActivity: "Trading", nicDescription: "Apparel and garments", state: "Kerala", city: "Kochi", dateOfRegistration: "2021-01-24" },
    { udyamNumber: "UDYAM-HR-00-1234567", enterpriseName: "Patel Hardware Store", enterpriseType: "Small", majorActivity: "Trading", nicDescription: "Hardware and construction supplies", state: "Haryana", city: "Faridabad", dateOfRegistration: "2020-12-01" },
    { udyamNumber: "UDYAM-UP-00-7654321", enterpriseName: "Neelgiri Physio Clinic", enterpriseType: "Small", majorActivity: "Services", nicDescription: "Physiotherapy Clinic", state: "Uttar Pradesh", city: "Lucknow", dateOfRegistration: "2021-08-15" },
    { udyamNumber: "UDYAM-WB-00-8765432", enterpriseName: "Bengal Sweets & Snacks", enterpriseType: "Micro", majorActivity: "Trading", nicDescription: "Sweets and confectionery", state: "West Bengal", city: "Kolkata", dateOfRegistration: "2020-01-10" },
    { udyamNumber: "UDYAM-GJ-00-5432109", enterpriseName: "Ahmedabad Auto Parts", enterpriseType: "Small", majorActivity: "Trading", nicDescription: "Automobile components", state: "Gujarat", city: "Ahmedabad", dateOfRegistration: "2020-09-05" },
    { udyamNumber: "UDYAM-KA-00-6543210", enterpriseName: "Bangalore Coffee House", enterpriseType: "Small", majorActivity: "Services", nicDescription: "Cafe and beverage", state: "Karnataka", city: "Bengaluru", dateOfRegistration: "2017-06-20" },
    { udyamNumber: "UDYAM-TS-00-9876543", enterpriseName: "Telangana Pharma Distributors", enterpriseType: "Medium", majorActivity: "Trading", nicDescription: "Pharmaceutical distributor", state: "Telangana", city: "Hyderabad", dateOfRegistration: "2021-10-01" },
    { udyamNumber: "UDYAM-RJ-00-1122334", enterpriseName: "Rajasthan Handicrafts Emporium", enterpriseType: "Micro", majorActivity: "Trading", nicDescription: "Handicrafts and textiles", state: "Rajasthan", city: "Jaipur", dateOfRegistration: "2018-03-15" },
  ];

  for (const u of specimenUdyams) {
    await prisma.udyamRecord.upsert({
      where: { udyamNumber: u.udyamNumber },
      update: u,
      create: u,
    });
  }

  console.log("   ✓ Specimen registry records loaded.");
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Starting Project Udyam Digital database seed...\n");

  await seedProducts();
  await seedGstinRecords();
  await seedUdyamRecords();
  await seedSpecimens();
  await seedLeads();
  await seedInitialOrders();

  console.log("\n✅ Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
