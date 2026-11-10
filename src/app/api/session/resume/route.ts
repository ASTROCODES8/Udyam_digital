import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") || searchParams.get("sessionId");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // 1. Check if token matches a Session
    const session = await prisma.session.findUnique({
      where: { id: token },
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (session) {
      const activeOrder = session.orders[0] || null;
      let resumeStep: "ADVISOR" | "QUOTE" | "KYC" | "TRACKER" = "ADVISOR";
      let resumeUrl = `/?token=${session.id}`;

      if (activeOrder) {
        if (activeOrder.status === "ACTIVE" || activeOrder.status === "INSTALLING" || activeOrder.status === "INSTALLATION_SCHEDULED") {
          resumeStep = "TRACKER";
          resumeUrl = `/track/${activeOrder.id}?token=${session.id}`;
        } else if (activeOrder.status === "KYC_VERIFIED" || activeOrder.status === "KYC_COMPLETE" || activeOrder.status === "QUOTE_ACCEPTED") {
          resumeStep = "KYC";
          resumeUrl = `/kyc?orderId=${activeOrder.id}&token=${session.id}`;
        }
      } else if (session.status === "QUOTE" || session.recommendedBundle) {
        resumeStep = "QUOTE";
        resumeUrl = `/quote?sessionId=${session.id}&token=${session.id}`;
      }

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          businessName: session.businessName,
          businessType: session.businessType,
          status: session.status,
          resumeStep,
          resumeUrl,
          orderId: activeOrder?.id || null,
        },
      });
    }

    // 2. Check if token matches an Order ID directly (e.g. ORD-0001)
    const order = await prisma.order.findUnique({
      where: { id: token },
      include: { session: true },
    });

    if (order) {
      let resumeStep: "KYC" | "TRACKER" = "TRACKER";
      let resumeUrl = `/track/${order.id}`;

      if (order.status === "QUOTE_ACCEPTED" || order.status === "KYC_PENDING") {
        resumeStep = "KYC";
        resumeUrl = `/kyc?orderId=${order.id}&token=${order.sessionId || ""}`;
      }

      return NextResponse.json({
        success: true,
        session: {
          id: order.sessionId || order.id,
          businessName: order.businessName,
          status: order.status,
          resumeStep,
          resumeUrl,
          orderId: order.id,
        },
      });
    }

    return NextResponse.json({ success: false, message: "No active session found for token." }, { status: 404 });
  } catch (error) {
    console.error("Resume session API error:", error);
    return NextResponse.json({ error: "Failed to resume session" }, { status: 500 });
  }
}
