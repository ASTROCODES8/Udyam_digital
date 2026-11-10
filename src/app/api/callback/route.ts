import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      businessName = "",
      preferredSlot = "Immediate (within 15 mins)",
      notes = "",
      sessionId = null,
      orderId = null,
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone number are required for callback request." },
        { status: 400 }
      );
    }

    const callbackId = `CB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    // If order exists, log the event
    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order) {
        await prisma.orderEvent.create({
          data: {
            orderId,
            status: "CALLBACK_REQUESTED",
            title: `Callback Requested: ${callbackId}`,
            description: `${name} requested a call (${preferredSlot}). Notes: ${notes || "Assistance needed with application."}`,
            completed: true,
            metadata: JSON.stringify({
              callbackId,
              phone,
              preferredSlot,
              notes,
              sessionId,
              createdAt: nowIso,
            }),
          },
        });
      }
    }

    const whatsappText = `*Airtel Business Field Partner Callback Request*
📞 Request ID: ${callbackId}
👤 Customer: ${name} (${phone})
🏢 Business: ${businessName || "SMB Prospect"}
⏰ Preferred Time: ${preferredSlot}
📝 Notes: ${notes || "Assistance needed with digital onboarding"}
⏱ SLA: Field Representative will call within 15 minutes.`;

    const rmPhone = "919821044321";
    const whatsappUrl = `https://wa.me/${rmPhone}?text=${encodeURIComponent(whatsappText)}`;

    return NextResponse.json({
      success: true,
      callbackId,
      name,
      phone,
      preferredSlot,
      whatsappText,
      whatsappUrl,
      createdAt: nowIso,
      message: `Callback scheduled for ${name} at ${phone}. A field partner will contact you ${preferredSlot.toLowerCase()}.`,
    });
  } catch (error) {
    console.error("Callback API error:", error);
    return NextResponse.json(
      { error: "Failed to create callback request." },
      { status: 500 }
    );
  }
}
