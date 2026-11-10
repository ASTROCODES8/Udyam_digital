import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import {
  advisorTools,
  executeLookupGstin,
  executeCheckEligibility,
  executeBuildQuote,
} from "./tools";
import { runScriptedAdvisorFlow } from "./fallback";
import type { AdvisorMessage, BusinessProfileData, RecommendationPayload } from "./schema";
import type { BusinessProfile, QuoteLineInput, QuoteResult } from "../rules/types";

let cachedSystemPrompt: string | null = null;

function getSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  try {
    const promptPath = path.resolve(process.cwd(), "src", "lib", "llm", "prompts", "advisor.md");
    if (fs.existsSync(promptPath)) {
      cachedSystemPrompt = fs.readFileSync(promptPath, "utf-8");
      return cachedSystemPrompt;
    }
  } catch (err) {
    console.warn("Could not load advisor.md from filesystem, using embedded prompt:", err);
  }
  return "You are Accel Business's AI digital advisor for Indian MSMEs. Keep responses under 2 sentences. Reply in the user's language. Never state unverified prices or eligibility.";
}

async function runAdvisorWithModel(
  modelName: string,
  userMessage: string,
  history: AdvisorMessage[],
  currentProfile: BusinessProfileData,
  language: string,
  genAI: GoogleGenerativeAI,
  systemPrompt: string
): Promise<{
  reply: string;
  quickReplies: string[];
  recommendation: RecommendationPayload | null;
  updatedProfile: BusinessProfileData;
}> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: advisorTools }],
    generationConfig: {
      temperature: 0.2, // low temperature for grounded adherence
      maxOutputTokens: 500,
    },
  });

  // Format chat history for Google Generative AI (must start with 'user' and alternate)
  const validHistory: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of history) {
    if (!m.content || !m.content.trim()) continue;
    const role = m.role === "user" ? "user" : "model";
    if (validHistory.length === 0) {
      if (role === "user") {
        validHistory.push({ role: "user", parts: [{ text: m.content }] });
      }
    } else {
      const prevRole = validHistory[validHistory.length - 1].role;
      if (prevRole !== role) {
        validHistory.push({ role, parts: [{ text: m.content }] });
      } else {
        validHistory[validHistory.length - 1].parts[0].text += `\n${m.content}`;
      }
    }
  }

  // Ensure history ends with 'model' so the outgoing userMessage alternates cleanly
  if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === "user") {
    validHistory.pop();
  }

  const chat = model.startChat({
    history: validHistory,
  });

  let result = await chat.sendMessage(userMessage);
  let response = result.response;

  let latestQuote: QuoteResult | null = null;
  const updatedProfile: BusinessProfileData = { ...currentProfile };

  // Function Calling Loop (max 3 tool hops)
  let hops = 0;
  while (response.functionCalls() && response.functionCalls()!.length > 0 && hops < 3) {
    hops++;
    const call = response.functionCalls()![0];
    const { name, args } = call;

    let toolResult: unknown = null;

    if (name === "lookup_gstin") {
      const gstin = (args as { gstin: string }).gstin;
      toolResult = await executeLookupGstin(gstin);
      const res = toolResult as { found?: boolean; status?: string; legalName?: string };
      if (res.found) {
        updatedProfile.hasGstin = true;
        updatedProfile.gstin = gstin;
        updatedProfile.gstinStatus = res.status;
        updatedProfile.businessName = res.legalName;
      }
    } else if (name === "check_eligibility") {
      const p = args as { profile: BusinessProfile; productIds: string[] };
      toolResult = executeCheckEligibility(p.profile, p.productIds);
    } else if (name === "build_quote") {
      const qArgs = args as { profile: BusinessProfile; lines: QuoteLineInput[] };
      const quoteRes = executeBuildQuote(qArgs.profile, qArgs.lines);
      latestQuote = quoteRes;
      toolResult = quoteRes;
      if (qArgs.profile.segment) updatedProfile.segment = qArgs.profile.segment;
      if (qArgs.profile.city_tier) updatedProfile.cityTier = qArgs.profile.city_tier;
      if (qArgs.profile.employee_count) updatedProfile.employeeCount = qArgs.profile.employee_count;
      if (qArgs.profile.num_sites) updatedProfile.numSites = qArgs.profile.num_sites;
    }

    // Send tool response back to Gemini
    result = await chat.sendMessage([
      {
        functionResponse: {
          name,
          response: toolResult as Record<string, unknown>,
        },
      },
    ]);
    response = result.response;
  }

  const replyText = response.text() || "I have analyzed your business requirements.";

  // If a quote was built during tool execution, assemble the recommendation payload
  let recommendation: RecommendationPayload | null = null;
  if (latestQuote) {
    const segName = updatedProfile.segment || "micro";

    recommendation = {
      ready: true,
      bundleName:
        segName === "prof"
          ? "Professional Practice Pack"
          : segName === "multi"
          ? "Multi-Site Enterprise Connect Pack"
          : segName === "mfg"
          ? "Connected Factory Pack"
          : "Micro Digital Starter Pack",
      summary: `Complete telecom and digital bundle tailored for ${updatedProfile.businessType || "your business"}.`,
      whyReasons: [
        "Zero downtime SLA backed by Accel enterprise network.",
        "Single transparent monthly bill covering connectivity, security, and tools.",
        "Instant digital KYC with guaranteed fast installation.",
      ],
      profile: updatedProfile,
      quote: latestQuote,
      suggestedNextAction: "quote",
    };
  }

  // Generate context-aware quick reply chips
  const quickReplies = recommendation
    ? [
        language === "hi" ? "हाँ, कोटेशन देखें →" : "View Complete Quote →",
        language === "hi" ? "क्या कोई सस्ता विकल्प है?" : "Is there a cheaper option?",
        language === "hi" ? "प्लान में बदलाव करें" : "Modify Line Items",
      ]
    : [
        "Delhi / Mumbai (Tier 1)",
        "Tier 2 City",
        "1 to 5 staff",
        "Have Active GSTIN",
        "No GSTIN",
      ];

  return {
    reply: replyText,
    quickReplies,
    recommendation,
    updatedProfile,
  };
}

export async function processAdvisorMessage(
  userMessage: string,
  history: AdvisorMessage[] = [],
  currentProfile: BusinessProfileData = {},
  language: string = "en",
): Promise<{
  reply: string;
  quickReplies: string[];
  recommendation: RecommendationPayload | null;
  updatedProfile: BusinessProfileData;
}> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // If no API key is configured or offline, use the scripted flow directly
  if (!apiKey || apiKey === "") {
    return runScriptedAdvisorFlow(userMessage, history, currentProfile, language);
  }

  const candidateModels = [
    process.env.GEMINI_MODEL || "gemini-3.8-flash",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash",
  ];

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemPrompt = getSystemPrompt();

  for (const modelName of candidateModels) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout calling Gemini model ${modelName}`)), 10000)
      );
      return await Promise.race([
        runAdvisorWithModel(
          modelName,
          userMessage,
          history,
          currentProfile,
          language,
          genAI,
          systemPrompt
        ),
        timeoutPromise,
      ]);
    } catch (err) {
      console.warn(`[Advisor] Model ${modelName} failed, trying fallback:`, err);
    }
  }

  console.warn("[Advisor] All Gemini models failed or hit quota, falling back to scripted engine.");
  return runScriptedAdvisorFlow(userMessage, history, currentProfile, language);
}
