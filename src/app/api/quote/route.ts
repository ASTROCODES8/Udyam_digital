import { NextRequest, NextResponse } from "next/server";
import {
  buildQuote,
  checkDependencies,
  eligibility,
  priceLine,
  DEFAULT_CATALOGUE,
} from "@/lib/rules";
import type { BusinessProfile, QuoteLineInput } from "@/lib/rules/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      profile,
      lines = [],
      contractMonths,
    }: {
      profile: BusinessProfile;
      lines: QuoteLineInput[];
      contractMonths?: number;
    } = body;

    const safeProfile: BusinessProfile = profile || {
      segment: "micro",
      city_tier: 2,
      employee_count: 3,
      num_sites: 1,
      has_valid_gstin: false,
    };

    // 1. Direct Dependency Check for the requested lines
    const depCheck = checkDependencies(lines, DEFAULT_CATALOGUE);

    // 2. Build the Quote (uses deterministic rules)
    const quote = buildQuote(safeProfile, lines, DEFAULT_CATALOGUE);

    // Allow user to select a longer contract if desired (≥ min required)
    if (contractMonths && contractMonths >= quote.contract_months) {
      quote.contract_months = contractMonths;
    }

    // 3. Find Available Add-ons (eligible products NOT yet in the quote)
    const currentProductIds = quote.lines.map((l) => l.productId.toUpperCase());
    const availableAddons = DEFAULT_CATALOGUE.filter((p) => {
      if (currentProductIds.includes(p.product_id.toUpperCase())) return false;
      const elig = eligibility(safeProfile, p.product_id, DEFAULT_CATALOGUE);
      return elig.eligible;
    }).map((p) => {
      const price = priceLine(p, 1, safeProfile.segment, DEFAULT_CATALOGUE);
      return {
        productId: p.product_id,
        productName: p.product_name,
        category: p.category,
        description: p.description,
        unit: p.unit,
        monthlyPrice: price.unitPrice,
        setupFee: p.one_time_setup_inr,
        minContractMonths: p.min_contract_months,
      };
    });

    // 4. "Make it cheaper" suggestion engine
    // Finds intelligent swaps to lower monthly spend
    let cheaperOption: {
      canMakeCheaper: boolean;
      cheaperLines: QuoteLineInput[];
      monthlySaving: number;
      description: string;
    } | null = null;

    const cheaperLines: QuoteLineInput[] = lines.map((l) => ({ ...l }));
    let swapped = false;
    let savingDesc = "";

    // Candidate swap 1: Fibre 300 (P02) -> Fibre 100 (P01)
    const hasP02 = cheaperLines.find((l) => l.productId === "P02");
    const hasP03 = cheaperLines.find((l) => l.productId === "P03");
    const hasP09 = cheaperLines.find((l) => l.productId === "P09");

    if (hasP03) {
      hasP03.productId = "P02"; // 1G -> 300 Mbps
      swapped = true;
      savingDesc = "Downscaled 1 Gbps fibre to 300 Mbps";
    } else if (hasP02) {
      hasP02.productId = "P01"; // 300 Mbps -> 100 Mbps
      swapped = true;
      savingDesc = "Adjusted broadband speed from 300 Mbps to 100 Mbps";
    } else if (hasP09) {
      // Drop failover router
      const idx = cheaperLines.findIndex((l) => l.productId === "P09");
      if (idx !== -1) {
        cheaperLines.splice(idx, 1);
        swapped = true;
        savingDesc = "Removed optional 4G backup failover router";
      }
    } else {
      // Fibre 100 (P01) -> 5G AirFiber (P04)
      const hasP01 = cheaperLines.find((l) => l.productId === "P01");
      if (hasP01) {
        hasP01.productId = "P04";
        swapped = true;
        savingDesc = "Switched to wireless 5G AirFiber 100";
      }
    }

    if (swapped) {
      const cheaperQuote = buildQuote(safeProfile, cheaperLines, DEFAULT_CATALOGUE);
      const diff = quote.grand_monthly_total - cheaperQuote.grand_monthly_total;
      if (diff > 0) {
        cheaperOption = {
          canMakeCheaper: true,
          cheaperLines,
          monthlySaving: diff,
          description: `${savingDesc} (Saves ₹${diff.toLocaleString("en-IN")}/mo)`,
        };
      }
    }

    return NextResponse.json({
      quote,
      dependencyValid: depCheck.valid,
      missingDependencies: depCheck.missingDependencies,
      availableAddons,
      cheaperOption,
    });
  } catch (error) {
    console.error("Quote API error:", error);
    return NextResponse.json(
      { error: "Failed to calculate quote." },
      { status: 500 },
    );
  }
}
