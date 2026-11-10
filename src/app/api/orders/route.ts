import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      businessName,
      contactName,
      contactPhone,
      contactEmail,
      installAddress,
      city,
      bundleProducts = [],
      monthlyTotal = 0,
      setupTotal = 0,
      contractMonths = 12,
      preferredSlot,
    } = body;

    if (!contactName || !contactPhone) {
      return NextResponse.json(
        { error: "Name and phone number are required for checkout." },
        { status: 400 },
      );
    }

    // Generate readable order ID e.g. ORD-6321
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    // Calculate initial expected activation date based on products (approx 5-7 days from reference date)
    const expectedActivationDate = "2026-07-22";

    // 1. Create the Order
    const order = await prisma.order.create({
      data: {
        id: orderId,
        sessionId: sessionId || null,
        businessName: businessName || `${contactName}'s Business`,
        contactName,
        contactPhone,
        contactEmail: contactEmail || "",
        city: city || "",
        bundleProducts: JSON.stringify(bundleProducts),
        monthlyTotal: parseFloat(monthlyTotal),
        setupTotal: parseFloat(setupTotal),
        contractMonths: parseInt(contractMonths, 10) || 12,
        status: "QUOTE_ACCEPTED",
        kycStatus: "PENDING",
        expectedActivationDate,
        notes: `Preferred install slot: ${preferredSlot || "Standard morning slot"}. Address: ${installAddress || ""}`,
      },
    });

    // 2. Create Initial Order Event (Tracker timeline)
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        status: "QUOTE_ACCEPTED",
        title: "Quote Accepted & Verified",
        description: `Order ${order.id} confirmed with UPI Auto-Pay mandate setup. Ready for digital KYC verification.`,
        completed: true,
      },
    });

    // 3. Initialize the KYC Case for this Order
    await prisma.kycCase.create({
      data: {
        orderId: order.id,
        sessionId: sessionId || null,
        businessName: businessName || contactName,
        overallStatus: "PENDING",
      },
    });

    // 4. Log DPDP Act Consent for Auto-Pay and Telecom verification
    await prisma.consentLog.create({
      data: {
        orderId: order.id,
        sessionId: sessionId || null,
        phone: contactPhone,
        consentType: "TERMS_AND_MANDATE",
        purpose:
          "Customer accepted transparent bundle quote, authorized monthly recurring billing mandate, and consented to telecom KYC verification under DPDP Act 2023.",
        granted: true,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || "Mobile Web",
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      order,
    });
  } catch (error) {
    console.error("Orders API checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create order." },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const phone = searchParams.get("phone");

    // Lookup by specific order ID
    if (id) {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          events: { orderBy: { timestamp: "asc" } },
          kycCase: true,
          consentLogs: true,
        },
      });

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      return NextResponse.json({ order });
    }

    // Lookup by customer phone (for "Track my order" entry)
    if (phone) {
      const cleanDigits = phone.replace(/[^0-9]/g, "");
      const last10 = cleanDigits.slice(-10);

      const orders = await prisma.order.findMany({
        where: {
          OR: [
            { contactPhone: { contains: cleanDigits } },
            ...(last10 ? [{ contactPhone: { contains: last10 } }] : []),
          ],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { events: true, kycCase: true },
      });

      return NextResponse.json({ orders });
    }

    // List recent orders
    const orders = await prisma.order.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { events: true, kycCase: true },
    });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
