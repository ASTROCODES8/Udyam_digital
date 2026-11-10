/**
 * fallback.ts — Deterministic scripted advisor state machine.
 * Activated whenever Gemini API is unavailable, lacks an API key, or encounters rate limits.
 * Guarantees that the customer always receives a personalized, compliant recommendation.
 */

import { buildQuote, getDefaultBundle } from "../rules/bundles";
import type { BusinessProfile } from "../rules/types";
import type { AdvisorMessage, BusinessProfileData, RecommendationPayload } from "./schema";

export interface ScriptedResult {
  reply: string;
  quickReplies: string[];
  recommendation: RecommendationPayload | null;
  updatedProfile: BusinessProfileData;
}

export function runScriptedAdvisorFlow(
  userMessage: string,
  history: AdvisorMessage[],
  currentProfile: BusinessProfileData = {},
  language: string = "en",
): ScriptedResult {
  const isHi = language === "hi" || /[\u0900-\u097F]/.test(userMessage);
  const text = userMessage.toLowerCase().trim();

  // Clone current profile
  const p: BusinessProfileData = { ...currentProfile };

  // ── Handle "Price is high / Cheaper option" at any point ──────────────────
  if (
    text.includes("price") ||
    text.includes("expensive") ||
    text.includes("cheaper") ||
    text.includes("कम") ||
    text.includes("सस्ता") ||
    text.includes("महंगा") ||
    text.includes("budget")
  ) {
    // Generate a budget starter quote (e.g. 5G AirFiber + SIM)
    const budgetProfile: BusinessProfile = {
      segment: "micro",
      city_tier: (p.cityTier as 1 | 2) || 2,
      employee_count: p.employeeCount || 2,
      num_sites: 1,
      has_valid_gstin: false,
    };

    const budgetQuote = buildQuote(budgetProfile, [
      { productId: "P04", qty: 1 }, // Biz 5G AirFiber 100 @ 899
      { productId: "P07", qty: 1 }, // Postpaid 299 @ 299
    ]);

    const rec: RecommendationPayload = {
      ready: true,
      bundleName: isHi ? "किफायती उद्यम स्टार्टर पैक" : "Budget Udyam Starter Pack",
      summary: isHi
        ? "बिना किसी बड़े खर्च के तुरंत शुरू होने वाला 5G वायरलेस ब्रॉडबैंड और बिजनेस सिम।"
        : "Low-cost plug-and-play 5G broadband with business SIM to keep your business connected under budget.",
      whyReasons: isHi
        ? [
            "कोई सेटअप या केबल बिछाने का शुल्क नहीं (₹0 शुल्क)।",
            "प्लग-एंड-प्ले 5G एयरफाइबर केवल 48 घंटे में सक्रिय होता है।",
            "जीएसटी पंजीकरण की कोई बाध्यता नहीं — आधार से तुरंत सक्रियण।",
          ]
        : [
            "Zero setup or installation charges (₹0 setup fee).",
            "Plug-and-play 5G AirFiber delivers 100 Mbps within 48 hours without trenching.",
            "100% accessible without a GSTIN using basic signatory ID.",
          ],
      profile: p,
      quote: budgetQuote,
      isCheaperAlternative: true,
      suggestedNextAction: "quote",
    };

    return {
      reply: isHi
        ? `हम आपके बजट का पूरा सम्मान करते हैं। हमने एक विशेष किफायती पैक तैयार किया है जो मात्र ₹${budgetQuote.grand_monthly_total}/महीने में शुरू होता है।`
        : `We completely understand your budget. We have curated a high-value starter plan at just ₹${budgetQuote.grand_monthly_total}/month all-inclusive.`,
      quickReplies: isHi
        ? ["हाँ, यह कोटेशन देखें", "मुझे पीओएस बिलिंग भी चाहिए", "ग्राहक सहायता से बात करें"]
        : ["View this quote", "Add Cloud POS terminal", "Talk to an expert"],
      recommendation: rec,
      updatedProfile: p,
    };
  }

  // ── Extract profile signals from text or history ─────────────────────────
  // Business Type
  if (text.includes("clinic") || text.includes("doctor") || text.includes("hospital") || text.includes("क्लिनिक")) {
    p.businessType = "Clinic / Healthcare";
    p.segment = "prof";
  } else if (text.includes("kirana") || text.includes("grocery") || text.includes("bakery") || text.includes("retail") || text.includes("दुकान")) {
    p.businessType = "Retail / Kirana";
    p.segment = "micro";
  } else if (text.includes("ca ") || text.includes("lawyer") || text.includes("office") || text.includes("consult") || text.includes("ऑफिस")) {
    p.businessType = "Professional Office";
    p.segment = "prof";
  } else if (text.includes("branch") || text.includes("chain") || text.includes("multi") || text.includes("ब्रांच")) {
    p.businessType = "Multi-site Retail";
    p.segment = "multi";
  } else if (text.includes("factory") || text.includes("manufactur") || text.includes("plant") || text.includes("कारखाना")) {
    p.businessType = "Small Manufacturing";
    p.segment = "mfg";
  }

  // City & Tier
  if (text.includes("delhi") || text.includes("mumbai") || text.includes("bengaluru") || text.includes("chennai") || text.includes("kolkata") || text.includes("pune") || text.includes("hyderabad") || text.includes("tier 1") || text.includes("मेट्रो")) {
    p.city = "Metro (Tier 1)";
    p.cityTier = 1;
  } else if (text.includes("ludhiana") || text.includes("nagpur") || text.includes("kochi") || text.includes("indore") || text.includes("tier 2") || text.includes("टियर 2")) {
    p.city = "Tier 2 City";
    p.cityTier = 2;
  }

  // GSTIN status or GSTIN string
  const gstinMatch = text.toUpperCase().match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}\b/);
  if (gstinMatch) {
    p.hasGstin = true;
    p.gstin = gstinMatch[0];
    p.gstinStatus = "Active";
  } else if (text.includes("have gst") || text.includes("yes gst") || text.includes("हाँ gst") || text.includes("gstin है") || text.includes("active gstin") || text.includes("yes")) {
    p.hasGstin = true;
    p.gstinStatus = "Active";
  } else if (text.includes("no gst") || text.includes("not have") || text.includes("don't have") || text.includes("without") || text.includes("no gstin") || text.includes("नहीं") || text.includes("बिना")) {
    p.hasGstin = false;
    p.gstinStatus = "None";
  }

  // Employees & Sites count
  const empMatch = text.match(/(\d+)\s*(emp|staff|people|लोग|कर्मचारी)/);
  if (empMatch) {
    p.employeeCount = parseInt(empMatch[1], 10);
  } else if (text.includes("1-5") || text.includes("1 to 5")) {
    p.employeeCount = 3;
  } else if (text.includes("6-20") || text.includes("10")) {
    p.employeeCount = 10;
  } else if (text.includes("20+")) {
    p.employeeCount = 25;
  }

  const siteMatch = text.match(/(\d+)\s*(site|branch|outlet|office|दुकान|ब्रांच)/);
  if (siteMatch) {
    p.numSites = parseInt(siteMatch[1], 10);
    if (p.numSites > 1) p.segment = "multi";
  }

  // ── Step-by-Step Flow Evaluation ──────────────────────────────────────────

  // Stage 1: If business type not identified
  if (!p.businessType) {
    return {
      reply: isHi
        ? "नमस्ते! एक्सेल बिजनेस में आपका स्वागत है। आपका किस प्रकार का व्यवसाय है?"
        : "Welcome to Accel Business! What kind of business do you run?",
      quickReplies: isHi
        ? ["किराना / रिटेल शॉप", "डॉक्टर क्लिनिक / लैब", "सीए / कंसल्टिंग ऑफिस", "मल्टीपल ब्रांचेज", "छोटी फैक्ट्री"]
        : ["Kirana / Retail Shop", "Doctor Clinic / Lab", "CA / Consulting Firm", "Multi-branch Retail", "Small Manufacturing"],
      recommendation: null,
      updatedProfile: p,
    };
  }

  // Stage 2: Location / Tier
  if (!p.cityTier) {
    return {
      reply: isHi
        ? `बढ़िया! आपका ${p.businessType} किस शहर में स्थित है?`
        : `Great! Which city is your ${p.businessType} located in?`,
      quickReplies: isHi
        ? ["दिल्ली / मुंबई / बेंगलुरु (टियर 1)", "लुधियाना / नागपुर / कोच्चि (टियर 2)", "अन्य टियर 2 शहर"]
        : ["Delhi / Mumbai / Bengaluru (Tier 1)", "Ludhiana / Nagpur / Kochi (Tier 2)", "Other Tier 2 City"],
      recommendation: null,
      updatedProfile: p,
    };
  }

  // Stage 3: Employee count
  if (!p.employeeCount) {
    return {
      reply: isHi
        ? "आपके संस्थान में कितने कर्मचारी काम करते हैं और कितनी शाखाएँ हैं?"
        : "How many employees work at your business, and how many sites do you have?",
      quickReplies: isHi
        ? ["1 से 5 कर्मचारी (1 शॉप)", "6 से 15 कर्मचारी (1 ऑफिस)", "20+ कर्मचारी (मल्टी-साइट)"]
        : ["1 to 5 staff (1 shop)", "6 to 15 staff (1 office)", "20+ staff (multi-site)"],
      recommendation: null,
      updatedProfile: p,
    };
  }

  // Stage 4: GSTIN check
  if (p.hasGstin === undefined) {
    if (p.employeeCount && p.employeeCount >= 5) {
      p.hasGstin = true;
      p.gstinStatus = "Active";
    } else {
      return {
        reply: isHi
          ? "क्या आपके पास सक्रिय जीएसटी (GSTIN) पंजीकरण है? (बिना जीएसटी के भी हमारे पास शानदार प्लान हैं!)"
          : "Do you have an active GSTIN registration? (We also have plans available without GST!)",
        quickReplies: isHi
          ? ["हाँ, मेरे पास GSTIN है", "नहीं, बिना GSTIN के शुरू करना है", "03PJNXS4821G1ZB"]
          : ["Yes, have active GSTIN", "No GSTIN (need basic pack)", "03PJNXS4821G1ZB"],
        recommendation: null,
        updatedProfile: p,
      };
    }
  }

  // ── Stage 5: Ready to Recommend! ──────────────────────────────────────────
  const profileForRule: BusinessProfile = {
    segment: p.segment || "micro",
    city_tier: (p.cityTier as 1 | 2) || 2,
    employee_count: p.employeeCount || 3,
    num_sites: p.numSites || 1,
    has_valid_gstin: p.hasGstin || false,
    gstin_status: p.gstinStatus || (p.hasGstin ? "Active" : undefined),
  };

  const calculatedQuote = getDefaultBundle(profileForRule);

  // Generate segment specific recommendation bundle
  let bundleName = isHi ? "माइक्रो डिजिटल स्टार्टर पैक" : "Micro Digital Starter Pack";
  let summary = isHi
    ? "आपकी दुकान के लिए हाई-स्पीड ब्रॉडबैंड, 2 बिजनेस कॉलिंग सिम और डिजिटल पीओएस बिलिंग।"
    : "High-speed broadband, 2 postpaid business lines, and digital billing terminal for single-site operations.";
  let whyReasons = [
    isHi ? "बिना किसी जीएसटी दस्तावेज के मात्र 15 मिनट में डिजिटल ऑनबोर्डिंग।" : "100% digital KYC completed in one sitting without mandatory GST paperwork.",
    isHi ? "असीमित 100 Mbps फाइबर ताकि बिलिंग और यूपीआई पेमेंट कभी न रुकें।" : "Unlimited 100 Mbps fibre ensures zero downtime for UPI & card payments.",
    isHi ? "सभी सेवाओं का एक सिंगल, पारदर्शी मासिक बिल।" : "All connectivity and POS billed together in a single transparent monthly invoice.",
  ];

  if (p.segment === "prof") {
    bundleName = isHi ? "प्रोफेशनल प्रैक्टिस ग्रोथ पैक" : "Professional Practice Pack";
    summary = isHi
      ? "क्लीनिक और ऑफिस के लिए 300 Mbps फाइबर, आईवीआर क्लाउड टेलीफोनी और 5 बिजनेस ईमेल।"
      : "Dedicated 300 Mbps fibre, IVR smart call management, and branded business email suite.";
    whyReasons = [
      isHi ? "300 Mbps अल्ट्रा-फास्ट ब्रॉडबैंड बिना किसी डेटा सीमा के।" : "300 Mbps ultra-fast broadband for video consultations and instant cloud uploads.",
      isHi ? "आईवीआर क्लाउड रिसेप्शनिस्ट: आपके कस्टमर कभी 'व्यस्त' टोन नहीं सुनेंगे।" : "Smart IVR receptionist so patient/client calls are never missed.",
      isHi ? "ब्रांडेड प्रोफेशनल ईमेल और वेटिंग रूम के लिए सुरक्षित गेस्ट वाई-फाई।" : "Branded company domain email with isolated guest Wi-Fi for clients.",
    ];
  } else if (p.segment === "multi") {
    bundleName = isHi ? "मल्टी-साइट कनेक्ट पैक" : "Multi-Site Enterprise Connect Pack";
    summary = isHi
      ? "सभी शाखाओं के लिए एसडी-वैन प्रबंधित नेटवर्क और स्वचालित 4जी बैकअप फेलओवर।"
      : "Centralized SD-WAN link management, auto 4G failover, and multi-site store Wi-Fi.";
    whyReasons = [
      isHi ? "सेंट्रल एसडी-वैन से सभी शाखाओं की लाइव मॉनिटरिंग।" : "Unified central dashboard to monitor network health across all retail branches.",
      isHi ? "ऑटोमैटिक 4G बैकअप: मुख्य केबल कटने पर भी बिलिंग चालू रहती है।" : "Zero downtime: automatic 4G failover router keeps card swipe machines active.",
      isHi ? "सभी शाखाओं का सेंट्रलाइज्ड बिल और समर्पित 24x7 अकाउंट मैनेजर।" : "Consolidated monthly billing with enterprise-grade SLA support.",
    ];
  } else if (p.segment === "mfg") {
    bundleName = isHi ? "कनेक्टेड फैक्ट्री ऑपरेशन्स पैक" : "Connected Factory & Operations Pack";
    summary = isHi
      ? "99.5% एसएलए लीज्ड लाइन, आईओटी मशीन मॉनिटरिंग और जीपीएस फ्लीट ट्रैकिंग।"
      : "Dedicated 1:1 Internet Leased Line with 99.5% SLA, IoT machine sensors, and fleet tracking.";
    whyReasons = [
      isHi ? "99.5% अपटाइम गारंटी वाली समर्पित 1:1 इंटरनेट लीज्ड लाइन।" : "Dedicated 1:1 leased line with guaranteed 99.5% SLA uptime for plant ERP.",
      isHi ? "मशीनों के रनटाइम और बिजली खपत पर नज़र रखने के लिए आईओटी सेंसर्स।" : "Machine monitoring IoT sensor kit tracks production uptime and energy usage.",
      isHi ? "सप्लाई डिलीवरी गाड़ियों की लाइव जीपीएस ट्रैकिंग।" : "Real-time GPS fleet trackers for factory dispatch vehicles.",
    ];
  }

  const recommendation: RecommendationPayload = {
    ready: true,
    bundleName,
    summary,
    whyReasons,
    profile: p,
    quote: calculatedQuote,
    suggestedNextAction: "quote",
  };

  const reply = isHi
    ? `आपकी ज़रूरतों के अनुसार हमने **${bundleName}** तैयार किया है। इसका कुल खर्च ₹${calculatedQuote.grand_monthly_total}/महीना (जीएसटी सहित) है। क्या आप इसका विस्तृत कोटेशन देखना चाहेंगे?`
    : `Based on your setup, I have configured the **${bundleName}** at ₹${calculatedQuote.grand_monthly_total}/month all-inclusive. Would you like to review the complete quote?`;

  return {
    reply,
    quickReplies: isHi
      ? ["हाँ, कोटेशन देखें →", "क्या कोई सस्ता विकल्प है?", "उत्पादों में बदलाव करें"]
      : ["View Complete Quote →", "Is there a cheaper option?", "Customize Add-ons"],
    recommendation,
    updatedProfile: p,
  };
}
