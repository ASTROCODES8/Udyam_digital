import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { orderId, action = "advance" } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { events: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Handle Reset action for demo presentation
    if (action === "reset") {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "QUOTE_ACCEPTED",
          actualActivationDate: null,
        },
      });

      // Clear downstream events, keep only the initial quote accepted event
      await prisma.orderEvent.deleteMany({
        where: {
          orderId,
          status: { notIn: ["QUOTE_ACCEPTED"] },
        },
      });

      const refreshed = await prisma.order.findUnique({
        where: { id: orderId },
        include: { events: { orderBy: { timestamp: "asc" } }, kycCase: true },
      });

      return NextResponse.json({
        success: true,
        action: "reset",
        nextStatus: "QUOTE_ACCEPTED",
        order: refreshed,
      });
    }

    // Advance logic across the 5 canonical stages:
    // 1. Quote accepted -> 2. KYC verified -> 3. Site survey/Installation scheduled -> 4. Installing -> 5. Activated
    const currentStatus = order.status;
    let nextStatus = currentStatus;
    let title = "";
    let description = "";
    let metadata: Record<string, unknown> = { advancedAt: new Date().toISOString() };

    if (currentStatus === "QUOTE_ACCEPTED" || currentStatus === "KYC_PENDING") {
      nextStatus = "KYC_VERIFIED";
      title = "KYC verified";
      description = "All registry checks and document proofs passed. UIDAI Aadhaar e-Sign legally recorded under DPDP Act 2023.";
    } else if (currentStatus === "KYC_VERIFIED" || currentStatus === "KYC_COMPLETE") {
      nextStatus = "INSTALLATION_SCHEDULED";
      title = "Site survey/Installation scheduled";
      description = "Site survey completed. Lead Field Engineer Ramesh Sharma (+91 98210 44321) scheduled for on-premise installation.";
      metadata = {
        ...metadata,
        engineerName: "Ramesh Sharma",
        engineerPhone: "+91 98210 44321",
        vehicle: "DL-12-AB-3421 (ID: AT-ENG-8402)",
        slot: "10:00 AM - 1:00 PM",
      };
    } else if (currentStatus === "INSTALLATION_SCHEDULED" || currentStatus === "DISPATCHED") {
      nextStatus = "INSTALLING";
      title = "Installing";
      description = "Field technician arrived on site. Optical cable routed, Wi-Fi 6 router configured, static IP bound.";
      metadata = {
        ...metadata,
        engineerName: "Ramesh Sharma",
        engineerPhone: "+91 98210 44321",
        progress: "Fiber pulled and ONT splicing underway",
      };
    } else if (currentStatus === "INSTALLING") {
      nextStatus = "ACTIVE";
      title = "Activated";
      description = "100% committed throughput speed verified. Zero Packet Loss SLA live. Single consolidated monthly bill generated.";
      metadata = {
        ...metadata,
        billingAccountNumber: "BAN-8402-9912",
        relationshipManager: "Anita Roy (+91 800-AIRTEL-BIZ)",
        speedTest: "100 Mbps Down / 100 Mbps Up (100% throughput)",
      };
    } else {
      return NextResponse.json({
        message: "Order is already in final ACTIVE state.",
        order,
      });
    }

    // 1. Update Order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        actualActivationDate: nextStatus === "ACTIVE" ? "2026-07-18" : order.actualActivationDate,
      },
    });

    // 2. Add OrderEvent
    await prisma.orderEvent.create({
      data: {
        orderId,
        status: nextStatus,
        title,
        description,
        completed: true,
        metadata: JSON.stringify(metadata),
      },
    });

    const refreshed = await prisma.order.findUnique({
      where: { id: orderId },
      include: { events: { orderBy: { timestamp: "asc" } }, kycCase: true },
    });

    return NextResponse.json({
      success: true,
      nextStatus,
      order: refreshed,
    });
  } catch (error) {
    console.error("Advance order error:", error);
    return NextResponse.json(
      { error: "Failed to advance order milestone" },
      { status: 500 }
    );
  }
}
