"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/language";
import type { QuoteResult, PriceLineResult, BusinessProfile, QuoteLineInput } from "@/lib/rules/types";
import JourneyProgressBar from "@/components/JourneyProgressBar";
import { getSessionToken, setSessionToken, getStoredOrderId, setStoredOrderId } from "@/lib/sessionClient";
import {
  ShieldCheck,
  ArrowRight,
  TrendingDown,
  Plus,
  Minus,
  AlertTriangle,
  HelpCircle,
  Calendar,
  Lock,
  ArrowLeft,
  Smartphone,
  CreditCard,
  Layers,
} from "lucide-react";

interface AddonProduct {
  productId: string;
  productName: string;
  category: string;
  description: string;
  unit: string;
  monthlyPrice: number;
  setupFee: number;
  minContractMonths: number;
}

export default function QuotePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 mt-3 font-medium">Loading quote details...</p>
        </div>
      }
    >
      <QuoteContent />
    </Suspense>
  );
}

function QuoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isHi = language === "hi";

  const [sessionId, setSessionId] = useState<string>("");
  const [profile, setProfile] = useState<BusinessProfile>({
    segment: "micro",
    city_tier: 2,
    employee_count: 3,
    num_sites: 1,
    has_valid_gstin: false,
    monthly_telecom_spend_inr: 3200,
  });

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [lines, setLines] = useState<QuoteLineInput[]>([]);
  const [availableAddons, setAvailableAddons] = useState<AddonProduct[]>([]);
  const [cheaperOption, setCheaperOption] = useState<{
    canMakeCheaper: boolean;
    cheaperLines: QuoteLineInput[];
    monthlySaving: number;
    description: string;
  } | null>(null);

  const [dependencyWarning, setDependencyWarning] = useState<string | null>(null);
  const [canCheckout, setCanCheckout] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [, startTransition] = useTransition();

  // Price animation flash state
  const [priceFlash, setPriceFlash] = useState(false);

  // Contract duration selection
  const [selectedContract, setSelectedContract] = useState<number>(12);

  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"DETAILS" | "OTP" | "MANDATE" | "SUBMITTING">("DETAILS");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [installAddress, setInstallAddress] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("Tomorrow, 10:00 AM - 1:00 PM");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // 1. Initial Load: Fetch session or initialize default quote
  useEffect(() => {
    let sId = searchParams.get("sessionId") || searchParams.get("token");
    if (!sId && typeof window !== "undefined") {
      sId = getSessionToken();
    }
    if (!sId) {
      sId = "sess_default";
    }
    setSessionId(sId);
    setSessionToken(sId);

    async function loadSession() {
      setLoading(true);
      try {
        const res = await fetch(`/api/advisor?sessionId=${sId}`);
        const data = await res.json();

        const initialProfile: BusinessProfile = {
          segment: data?.session?.segment || "micro",
          city_tier: (data?.session?.cityTier as 1 | 2) || 2,
          employee_count: data?.session?.employeeCount || 3,
          num_sites: data?.session?.numSites || 1,
          has_valid_gstin: data?.session?.hasGstin || false,
          gstin_status: data?.session?.hasGstin ? "Active" : undefined,
          monthly_telecom_spend_inr: 3200,
        };

        if (data?.session?.businessName) {
          setContactName(data.session.businessName);
        }

        setProfile(initialProfile);

        // Extract recommended products from session bundle
        let initialLines: QuoteLineInput[] = [];
        if (data?.bundle?.recommendation?.quote?.lines) {
          initialLines = data.bundle.recommendation.quote.lines.map((l: PriceLineResult) => ({
            productId: l.productId,
            qty: l.qty,
          }));
        } else {
          // Default initial lines for micro
          initialLines = [
            { productId: "P01", qty: 1 },
            { productId: "P07", qty: 2 },
            { productId: "P19", qty: 1 },
          ];
        }

        setLines(initialLines);
        await refreshQuote(initialProfile, initialLines);
      } catch (err) {
        console.error("Failed to load session:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [searchParams]);

  // 2. Refresh quote calculation from backend rules engine
  const refreshQuote = async (
    targetProfile: BusinessProfile,
    targetLines: QuoteLineInput[],
    contractDur?: number,
  ) => {
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: targetProfile,
          lines: targetLines,
          contractMonths: contractDur || selectedContract,
        }),
      });

      const data = await res.json();
      if (data.quote) {
        setQuote(data.quote);
        setSelectedContract(data.quote.contract_months);
        setAvailableAddons(data.availableAddons || []);
        setCheaperOption(data.cheaperOption);

        // Trigger brief pulse animation on price change
        setPriceFlash(true);
        setTimeout(() => setPriceFlash(false), 300);

        // Check if removing a dependency caused an issue
        if (!data.dependencyValid && data.missingDependencies?.length > 0) {
          setDependencyWarning(
            isHi
              ? `चेतावनी: चयनित उत्पाद के लिए मुख्य इंटरनेट कनेक्शन आवश्यक है। कृपया ब्रॉडबैंड लाइन जोड़ें।`
              : `Warning: ${data.missingDependencies[0].productName} requires a base internet link. Checkout is blocked until a connectivity product is added.`,
          );
          setCanCheckout(false);
        } else {
          setDependencyWarning(null);
          setCanCheckout(true);
        }
      }
    } catch (err) {
      console.error("Quote recalculation failed:", err);
    }
  };

  // Modify quantity of existing line
  const handleQtyChange = (productId: string, delta: number) => {
    startTransition(() => {
      const updated = lines
        .map((l) => {
          if (l.productId === productId) {
            const newQty = (l.qty || 1) + delta;
            return newQty > 0 ? { ...l, qty: newQty } : null;
          }
          return l;
        })
        .filter(Boolean) as QuoteLineInput[];

      setLines(updated);
      refreshQuote(profile, updated);
    });
  };

  // Remove a line item entirely
  const handleRemoveLine = (productId: string) => {
    startTransition(() => {
      const updated = lines.filter((l) => l.productId !== productId);
      setLines(updated);
      refreshQuote(profile, updated);
    });
  };

  // Toggle/Add an extra add-on product
  const handleAddAddon = (addon: AddonProduct) => {
    startTransition(() => {
      const updated = [...lines, { productId: addon.productId, qty: 1 }];
      setLines(updated);
      refreshQuote(profile, updated);
    });
  };

  // Apply "Make it cheaper" swap
  const handleApplyCheaper = () => {
    if (!cheaperOption || !cheaperOption.canMakeCheaper) return;
    startTransition(() => {
      setLines(cheaperOption.cheaperLines);
      refreshQuote(profile, cheaperOption.cheaperLines);
    });
  };

  // Handle contract length change
  const handleContractChange = (months: number) => {
    setSelectedContract(months);
    refreshQuote(profile, lines, months);
  };

  // Checkout: submit final order to backend
  const handleFinalCheckout = async () => {
    if (otpCode !== "123456") {
      setOtpError(true);
      return;
    }
    setOtpError(false);
    setCheckoutStep("SUBMITTING");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          businessName: contactName || "My Business",
          contactName,
          contactPhone,
          contactEmail,
          installAddress,
          city: profile.city_tier === 1 ? "Metro Area" : "Tier 2 Hub",
          bundleProducts: quote?.lines || [],
          monthlyTotal: quote?.grand_monthly_total || 0,
          setupTotal: quote?.one_time_total || 0,
          contractMonths: selectedContract,
          preferredSlot,
        }),
      });

      const data = await res.json();
      if (data.success && data.orderId) {
        setStoredOrderId(data.orderId);
        if (sessionId) setSessionToken(sessionId);
        router.push(`/kyc?orderId=${data.orderId}&token=${sessionId}`);
      }
    } catch (err) {
      console.error("Order creation failed:", err);
      alert("Checkout failed. Please try again.");
      setCheckoutStep("MANDATE");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-3 font-medium">
          {isHi ? "पारदर्शी कोटेशन तैयार हो रहा है..." : "Loading transparent quote..."}
        </p>
      </div>
    );
  }

  // Calculate comparison with what user pays today
  const currentSpend = profile.monthly_telecom_spend_inr || 3200;
  const quoteMonthly = quote?.grand_monthly_total || 0;
  const spendDiff = currentSpend - quoteMonthly;

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 pb-28 relative">
      {/* 4-Stage Top Journey Progress Bar */}
      <JourneyProgressBar
        currentStage="QUOTE"
        sessionId={sessionId}
        orderId={getStoredOrderId() || undefined}
      />
      {/* Top Breadcrumb & Status */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <Link
          href="/"
          className="text-xs text-gray-600 hover:text-red-600 flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isHi ? "सलाहकार चैट" : "Back to Advisor"}</span>
        </Link>
        <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
          <span>{isHi ? "जीएसटी-अनुपालन गारंटी" : "Verified Rates"}</span>
        </span>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Main Price Highlight Hero Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm overflow-hidden relative">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {isHi ? "पारदर्शी मासिक बिलिंग" : "Transparent Monthly Total"}
              </span>
              {/* Big Price with flash animation */}
              <div
                className={`mt-1 flex items-baseline space-x-1.5 transition-all duration-300 ${
                  priceFlash ? "scale-105 text-red-700" : "text-gray-900"
                }`}
              >
                <span className="text-3xl font-black tracking-tight text-red-600">
                  ₹{quote?.grand_monthly_total.toLocaleString("en-IN")}
                </span>
                <span className="text-sm font-semibold text-gray-500">
                  /{isHi ? "माह" : "month"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                ₹{quote?.monthly_total.toLocaleString("en-IN")} + 18% GST (₹
                {quote?.gst_18pct.toLocaleString("en-IN")})
              </p>
            </div>

            {/* Setup Fee Badge */}
            <div className="bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-2 text-right">
              <span className="text-[10px] text-gray-400 font-semibold block uppercase">
                {isHi ? "एकमुश्त सेटअप" : "One-time Setup"}
              </span>
              <span className="text-sm font-bold text-gray-800">
                {quote?.one_time_total === 0
                  ? isHi
                    ? "मुफ़्त (₹0)"
                    : "Free (₹0)"
                  : `₹${quote?.one_time_total.toLocaleString("en-IN")}`}
              </span>
            </div>
          </div>

          {/* Current Spend Comparison Banner */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              <span>{isHi ? "वर्तमान में आपका खर्च:" : "You pay today:"}</span>
              <span className="font-semibold text-gray-700">
                ₹{currentSpend.toLocaleString("en-IN")}/mo
              </span>
            </span>

            {spendDiff > 0 ? (
              <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                {isHi ? `बचत: ₹${spendDiff}/माह` : `Save ₹${spendDiff.toLocaleString("en-IN")}/mo`}
              </span>
            ) : (
              <span className="text-gray-500 font-medium">
                {isHi ? "व्यावसायिक अपग्रेड" : "Enterprise Uptime"}
              </span>
            )}
          </div>

          {/* "Make it cheaper" Button if available */}
          {cheaperOption && cheaperOption.canMakeCheaper && (
            <div className="mt-3 bg-amber-50/90 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-xs text-amber-900 font-medium">
                  {cheaperOption.description}
                </span>
              </div>
              <button
                onClick={handleApplyCheaper}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg shrink-0 shadow-2xs active:scale-95 transition-all"
              >
                {isHi ? "सस्ता करें" : "Apply"}
              </button>
            </div>
          )}

          {/* Contract Duration Selector */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{isHi ? "अनुबंध अवधि:" : "Contract duration:"}</span>
            </span>

            <div className="flex space-x-1.5">
              {[12, 24].map((duration) => {
                const isMinEnforced = (quote?.contract_months || 12) > duration;
                const isSelected = selectedContract === duration;

                return (
                  <button
                    key={duration}
                    disabled={isMinEnforced}
                    onClick={() => handleContractChange(duration)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-red-600 text-white border-red-600 shadow-2xs"
                        : isMinEnforced
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-300 hover:border-red-400"
                    }`}
                  >
                    {duration} {isHi ? "माह" : "mo"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dependency Warning Banner (Blocking Checkout if Invalid) */}
        {dependencyWarning && (
          <div className="bg-red-50 border-2 border-red-500 rounded-xl p-3 flex items-start space-x-2 text-xs text-red-800 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">{isHi ? "आवश्यक निर्भरता अनुपलब्ध" : "Dependency Required"}</p>
              <p className="mt-0.5">{dependencyWarning}</p>
            </div>
          </div>
        )}

        {/* Selected Line Items with Quantity Steppers */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 pb-2 border-b border-gray-100">
            <Layers className="w-4 h-4 text-red-600" />
            <span>{isHi ? "चयनित उत्पाद और सेवाएं" : "Selected Plan Components"}</span>
          </h3>

          <div className="divide-y divide-gray-100 mt-1">
            {quote?.lines.map((item) => (
              <div key={item.productId} className="py-3 flex items-center justify-between">
                <div className="pr-2">
                  <h4 className="font-bold text-gray-900 text-xs sm:text-sm">
                    {item.productName}
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    ₹{item.unitPrice.toLocaleString("en-IN")}/{item.unit}
                    {item.setupFee > 0 && ` • Setup: ₹${item.setupFee.toLocaleString("en-IN")}`}
                  </p>
                </div>

                {/* Quantity Stepper & Removal */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                    <button
                      onClick={() => handleQtyChange(item.productId, -1)}
                      className="p-1.5 text-gray-600 hover:text-red-600 active:scale-95"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 text-xs font-bold text-gray-800">{item.qty}</span>
                    <button
                      onClick={() => handleQtyChange(item.productId, 1)}
                      className="p-1.5 text-gray-600 hover:text-red-600 active:scale-95"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleRemoveLine(item.productId)}
                    className="text-gray-400 hover:text-red-600 p-1 text-xs"
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add-ons Section (Eligible Extra Products) */}
        {availableAddons.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">
                {isHi ? "अनुशंसित ऐड-ऑन (वैकल्पिक)" : "Available Eligible Add-ons"}
              </h3>
              <span className="text-[11px] text-gray-400">
                {availableAddons.length} {isHi ? "उपलब्ध" : "available"}
              </span>
            </div>

            <div className="divide-y divide-gray-100 mt-1">
              {availableAddons.slice(0, 4).map((addon) => (
                <div key={addon.productId} className="py-2.5 flex items-center justify-between">
                  <div className="pr-3">
                    <h4 className="font-semibold text-gray-800 text-xs">
                      {addon.productName}
                    </h4>
                    <p className="text-[11px] text-gray-500 line-clamp-1">{addon.description}</p>
                    <span className="text-[11px] font-bold text-gray-700">
                      +₹{addon.monthlyPrice.toLocaleString("en-IN")}/{addon.unit}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddAddon(addon)}
                    className="border border-red-500 text-red-600 hover:bg-red-50 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isHi ? "जोड़ें" : "Add"}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Checkout Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/95 backdrop-blur-md border-t border-gray-200 p-3.5 px-4 shadow-lg flex items-center justify-between z-40">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            {isHi ? "कुल मासिक देय" : "Total Monthly"}
          </span>
          <div className="flex items-baseline space-x-1">
            <span className="text-xl font-extrabold text-red-600">
              ₹{quote?.grand_monthly_total.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-gray-500">/{isHi ? "माह" : "mo"}</span>
          </div>
        </div>

        <button
          disabled={!canCheckout || (quote?.lines.length || 0) === 0}
          onClick={() => setShowCheckout(true)}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-98 flex items-center space-x-1.5 text-sm"
        >
          <span>{isHi ? "चेकआउट करें" : "Proceed to Checkout"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Checkout Drawer / Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">
                    {checkoutStep === "MANDATE"
                      ? isHi ? "यूपीआई ऑटो-पे सेटअप" : "UPI e-Mandate Setup"
                      : isHi ? "त्वरित चेकआउट" : "Fast-Track Checkout"}
                  </h3>
                  <span className="text-[10px] text-gray-500">
                    {isHi ? "15 मिनट में सक्रियण प्रक्रिया" : "DPDP Act 2023 Compliant"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowCheckout(false)}
                className="text-gray-400 hover:text-gray-700 p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* STEP 1: Details */}
            {checkoutStep === "DETAILS" && (
              <div className="space-y-3.5 mt-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    {isHi ? "व्यवसाय / संपर्क नाम" : "Business / Contact Name *"}
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    {isHi ? "मोबाइल नंबर (व्हाट्सएप)" : "Mobile Number (WhatsApp) *"}
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    {isHi ? "ईमेल पता (वैकल्पिक)" : "Email Address (Optional)"}
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="owner@business.in"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    {isHi ? "स्थापना का पता" : "Installation Address *"}
                  </label>
                  <input
                    type="text"
                    value={installAddress}
                    onChange={(e) => setInstallAddress(e.target.value)}
                    placeholder="Shop/Office No, Building, Street, Area"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    {isHi ? "पसंदीदा इंस्टॉलेशन समय" : "Preferred Installation Slot"}
                  </label>
                  <select
                    value={preferredSlot}
                    onChange={(e) => setPreferredSlot(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 bg-white focus:border-red-500 outline-none"
                  >
                    <option value="Tomorrow, 10:00 AM - 1:00 PM">Tomorrow, 10:00 AM - 1:00 PM</option>
                    <option value="Tomorrow, 2:00 PM - 6:00 PM">Tomorrow, 2:00 PM - 6:00 PM</option>
                    <option value="Day after tomorrow, 10:00 AM - 1:00 PM">Day after tomorrow, 10:00 AM - 1:00 PM</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    disabled={!contactName.trim() || !contactPhone.trim()}
                    onClick={() => setCheckoutStep("OTP")}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl shadow-md text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>{isHi ? "ओटीपी भेजें" : "Verify Mobile via WhatsApp OTP"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Mock OTP */}
            {checkoutStep === "OTP" && (
              <div className="space-y-4 mt-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">
                    {isHi ? "व्हाट्सएप ओटीपी दर्ज करें" : "Enter WhatsApp OTP"}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {isHi
                      ? `हमने ${contactPhone} पर 6-अंकों का कोड भेजा है। (डेमो के लिए 123456 दर्ज करें)`
                      : `Sent 6-digit code to ${contactPhone}. (For demo, use 123456)`}
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value);
                      setOtpError(false);
                    }}
                    placeholder="123456"
                    className="w-40 text-center tracking-widest text-lg font-black p-2 rounded-lg border-2 border-gray-300 focus:border-red-600 outline-none"
                  />
                  {otpError && (
                    <p className="text-[11px] text-red-600 font-bold mt-1">
                      {isHi ? "गलत ओटीपी। कृपया 123456 दर्ज करें।" : "Invalid OTP. Please enter 123456."}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (otpCode === "123456") {
                      setCheckoutStep("MANDATE");
                    } else {
                      setOtpError(true);
                    }
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl shadow-md text-xs"
                >
                  {isHi ? "ओटीपी सत्यापित करें" : "Verify & Continue"}
                </button>
              </div>
            )}

            {/* STEP 3: Mock UPI Mandate */}
            {checkoutStep === "MANDATE" && (
              <div className="space-y-3.5 mt-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-2">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-gray-900 text-xs">
                    {isHi ? "सुरक्षित ई-मेंडेट (ऑटो-पे)" : "Recurring UPI e-Mandate"}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {isHi
                      ? "आज ₹0 काटा जाएगा। बिलिंग केवल सफल सक्रियण के बाद शुरू होगी।"
                      : "₹0 charged today. Monthly debits start only AFTER your service is successfully activated."}
                  </p>

                  <div className="mt-3 p-2 bg-white rounded-lg border border-gray-200 text-xs flex justify-between font-bold">
                    <span>{isHi ? "अधिकतम मासिक सीमा:" : "Max Monthly Debit:"}</span>
                    <span className="text-red-600">
                      ₹{quote?.grand_monthly_total.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="terms" className="text-[11px] text-gray-600 leading-tight">
                    {isHi
                      ? "मैं नियम व शर्तों और डीपीडीपी अधिनियम 2023 के तहत डिजिटल टेलीकॉम केवाईसी सत्यापन के लिए सहमति देता हूँ।"
                      : "I accept the subscription terms and give consent for digital telecom KYC verification under DPDP Act, 2023."}
                  </label>
                </div>

                <button
                  disabled={!termsAccepted}
                  onClick={handleFinalCheckout}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5"
                >
                  <span>{isHi ? "मेंडेट सेट करें और केवाईसी पर जाएं" : "Authorize Mandate & Proceed to KYC"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* STEP 4: Submitting Spinner */}
            {checkoutStep === "SUBMITTING" && (
              <div className="py-8 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <h4 className="font-bold text-gray-900 text-sm">
                  {isHi ? "ऑर्डर बनाया जा रहा है..." : "Creating your order..."}
                </h4>
                <p className="text-xs text-gray-500">
                  {isHi ? "कृपया प्रतीक्षा करें, स्मार्ट केवाईसी पर भेजा जा रहा है" : "Redirecting to Smart KYC verification"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
