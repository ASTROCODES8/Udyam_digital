import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processAdvisorMessage } from "@/lib/llm/gemini";
import type { AdvisorMessage, BusinessProfileData } from "@/lib/llm/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      message,
      history = [],
      language = "en",
      profile = {},
    }: {
      sessionId?: string;
      message: string;
      history?: AdvisorMessage[];
      language?: string;
      profile?: BusinessProfileData;
    } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    // 1. Find or create Session
    let activeSessionId = sessionId;
    let existingSession = null;

    if (activeSessionId) {
      existingSession = await prisma.session.findUnique({
        where: { id: activeSessionId },
      });
    }

    if (!existingSession) {
      const newSession = await prisma.session.create({
        data: {
          language,
          status: "ADVISOR",
        },
      });
      activeSessionId = newSession.id;
    }

    // 2. Call Advisor Engine (Gemini with Tool Calling or Scripted Fallback)
    const result = await processAdvisorMessage(
      message,
      history,
      profile,
      language,
    );

    // 3. Persist Updated Session Data
    const updatedHistory: AdvisorMessage[] = [
      ...history,
      { role: "user", content: message, timestamp: new Date().toISOString() },
      {
        role: "model",
        content: result.reply,
        timestamp: new Date().toISOString(),
        quickReplies: result.quickReplies,
        recommendation: result.recommendation,
      },
    ];

    await prisma.session.update({
      where: { id: activeSessionId },
      data: {
        language,
        businessName: result.updatedProfile.businessName || existingSession?.businessName,
        businessType: result.updatedProfile.businessType || existingSession?.businessType,
        segment: result.updatedProfile.segment || existingSession?.segment,
        city: result.updatedProfile.city || existingSession?.city,
        cityTier: result.updatedProfile.cityTier || existingSession?.cityTier,
        employeeCount: result.updatedProfile.employeeCount || existingSession?.employeeCount,
        numSites: result.updatedProfile.numSites || existingSession?.numSites,
        hasGstin: result.updatedProfile.hasGstin ?? existingSession?.hasGstin,
        gstin: result.updatedProfile.gstin || existingSession?.gstin,
        recommendedBundle: JSON.stringify({
          recommendation: result.recommendation,
          history: updatedHistory,
        }),
      },
    });

    return NextResponse.json({
      sessionId: activeSessionId,
      reply: result.reply,
      quickReplies: result.quickReplies,
      recommendation: result.recommendation,
      profile: result.updatedProfile,
    });
  } catch (error) {
    console.error("Advisor API route error:", error);
    return NextResponse.json(
      {
        error: "Internal server error occurred.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId query param required" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let parsedBundle = null;
  if (session.recommendedBundle) {
    try {
      parsedBundle = JSON.parse(session.recommendedBundle);
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    session,
    bundle: parsedBundle,
  });
}
