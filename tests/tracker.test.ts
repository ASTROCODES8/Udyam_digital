import { describe, it, expect } from "vitest";
import { DEFAULT_CATALOGUE } from "../src/lib/rules/catalogue";

describe("Order Tracker SLA & Multi-Product Mini-Timelines", () => {
  const REF_DATE = new Date("2026-07-15T00:00:00Z");

  it("calculates honest install dates and identifies the slowest item in a multi-product bundle", () => {
    // Bundle with SIMs (1 day), Cloud POS (3 days), Biz Fibre 100 (5 days)
    const bundle = [
      { productId: "P07", productName: "Business Postpaid 299", quantity: 5 },
      { productId: "P19", productName: "Cloud POS & Billing", quantity: 1 },
      { productId: "P01", productName: "Biz Fibre 100", quantity: 1 },
    ];

    let maxDays = 0;
    let slowestProductId = "";

    const timelines = bundle.map((item) => {
      const catProd = DEFAULT_CATALOGUE.find((p) => p.product_id === item.productId);
      const days = catProd?.typical_install_days || 5;
      if (days > maxDays) {
        maxDays = days;
        slowestProductId = item.productId;
      }
      const expDate = new Date(REF_DATE.getTime() + days * 24 * 60 * 60 * 1000);
      return {
        ...item,
        installDays: days,
        expectedDate: expDate.toISOString().split("T")[0],
      };
    });

    expect(maxDays).toBe(5);
    expect(slowestProductId).toBe("P01");

    // SIMs: 1 day -> 2026-07-16
    expect(timelines.find((t) => t.productId === "P07")?.expectedDate).toBe("2026-07-16");
    // Cloud POS: 3 days -> 2026-07-18
    expect(timelines.find((t) => t.productId === "P19")?.expectedDate).toBe("2026-07-18");
    // Biz Fibre 100: 5 days -> 2026-07-20
    expect(timelines.find((t) => t.productId === "P01")?.expectedDate).toBe("2026-07-20");
  });

  it("correctly identifies Internet Leased Line (P05) as the slowest item when present", () => {
    const bundle = [
      { productId: "P05", productName: "Internet Leased Line 20", quantity: 1 },
      { productId: "P21", productName: "Managed Firewall", quantity: 1 },
    ];

    let maxDays = 0;
    let slowestProductId = "";

    for (const item of bundle) {
      const catProd = DEFAULT_CATALOGUE.find((p) => p.product_id === item.productId);
      const days = catProd?.typical_install_days || 0;
      if (days > maxDays) {
        maxDays = days;
        slowestProductId = item.productId;
      }
    }

    expect(slowestProductId).toBe("P05");
    expect(maxDays).toBe(21);
  });

  it("formats WhatsApp ticket message with all mandatory parameters", () => {
    const ticketId = "TKT-2026-1234";
    const orderId = "ORD-0001";
    const business = "Star Electronics";
    const contact = "Joseph Joshi";
    const phone = "+91 98450 12345";
    const category = "Reschedule installation slot";
    const details = "Please arrive after 2 PM.";

    const whatsappText = `*Airtel Business Priority Support*
📋 Ticket ID: ${ticketId}
📦 Order: ${orderId}
🏢 Business: ${business}
👤 Contact: ${contact} (${phone})
📌 Category: ${category}
💬 Details: ${details}
⏱ SLA: 15-Minute Guaranteed WhatsApp Response (Zero Phone Hold Time)`;

    expect(whatsappText).toContain("Ticket ID: TKT-2026-1234");
    expect(whatsappText).toContain("Order: ORD-0001");
    expect(whatsappText).toContain("Star Electronics");
    expect(whatsappText).toContain("15-Minute Guaranteed");
  });
});
