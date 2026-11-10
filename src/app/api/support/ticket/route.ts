import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      category = "General Inquiry",
      details = "Customer requested assistance with order fulfillment.",
      contactPhone = "",
      contactName = "",
      businessName = "",
    } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // Generate readable Support Ticket ID e.g. TKT-2026-8492
    const ticketId = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    const resolvedContactName = contactName || order?.contactName || "Customer";
    const resolvedPhone = contactPhone || order?.contactPhone || "+91 98765 00000";
    const resolvedBusiness = businessName || order?.businessName || "Airtel Business Customer";

    // Format pre-filled WhatsApp message for zero-wait customer support
    const whatsappText = `*Airtel Business Priority Support*
📋 Ticket ID: ${ticketId}
📦 Order: ${orderId}
🏢 Business: ${resolvedBusiness}
👤 Contact: ${resolvedContactName} (${resolvedPhone})
📌 Category: ${category}
💬 Details: ${details}
⏱ SLA: 15-Minute Guaranteed WhatsApp Response (Zero Phone Hold Time)`;

    const engineerPhone = "919821044321"; // Assigned Lead Engineer / Dispatch Desk
    const whatsappUrl = `https://wa.me/${engineerPhone}?text=${encodeURIComponent(whatsappText)}`;

    // If order exists, log the support event in OrderEvent timeline
    if (order) {
      await prisma.orderEvent.create({
        data: {
          orderId,
          status: "SUPPORT_TICKET_OPENED",
          title: `Support Ticket Created: ${ticketId}`,
          description: `${category}: ${details.length > 80 ? details.slice(0, 80) + "..." : details}`,
          completed: true,
          metadata: JSON.stringify({
            ticketId,
            category,
            details,
            createdAt: nowIso,
            channel: "WhatsApp Zero-Call Dispatch",
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      ticketId,
      category,
      details,
      whatsappText,
      whatsappUrl,
      createdAt: nowIso,
    });
  } catch (error) {
    console.error("Support ticket API error:", error);
    return NextResponse.json(
      { error: "Failed to create support ticket" },
      { status: 500 }
    );
  }
}
