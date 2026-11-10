"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  Calendar,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Share2,
  Copy,
  Check,
  FileText,
  HelpCircle,
  X,
  Download,
  UserCheck,
  ShieldCheck,
  PhoneCall,
  RotateCcw,
} from "lucide-react";
import { DEFAULT_CATALOGUE } from "@/lib/rules/catalogue";
import JourneyProgressBar from "@/components/JourneyProgressBar";
import { getSessionToken, setSessionToken, setStoredOrderId } from "@/lib/sessionClient";

interface OrderEvent {
  id: number;
  status: string;
  title: string;
  description: string;
  timestamp: string;
  completed: boolean;
  metadata?: string | null;
}

interface BundleItem {
  productId?: string;
  id?: string;
  productName?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  monthlyPrice?: number;
  unitPrice?: number;
  setupFee?: number;
}

interface OrderDetail {
  id: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  city: string;
  state?: string;
  bundleProducts: string;
  monthlyTotal: number;
  setupTotal: number;
  contractMonths: number;
  status: string;
  kycStatus: string;
  expectedActivationDate: string;
  actualActivationDate?: string;
  notes?: string;
  createdAt: string;
  events: OrderEvent[];
  kycCase?: {
    hasGstin: boolean;
    gstin?: string;
    hasUdyam: boolean;
    udyamNumber?: string;
    overallStatus: string;
  };
}

const REFERENCE_DATE_STR = "2026-07-15";

function formatDateGB(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TrackerContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = (params?.orderId as string) || "";
  const isDemo = searchParams.get("demo") === "1";
  const queryToken =
    searchParams.get("token") ||
    searchParams.get("sessionId") ||
    (typeof window !== "undefined" ? getSessionToken() : "") ||
    "";
  const [sessionId] = useState<string>(queryToken);

  useEffect(() => {
    if (orderId) setStoredOrderId(orderId);
    if (queryToken) setSessionToken(queryToken);
  }, [orderId, queryToken]);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [advancing, setAdvancing] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);
  const [copiedSupport, setCopiedSupport] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // "Something wrong?" Modal State
  const [isSupportOpen, setIsSupportOpen] = useState<boolean>(false);
  const [supportCategory, setSupportCategory] = useState<string>("Reschedule installation slot");
  const [supportDetails, setSupportDetails] = useState<string>("");
  const [supportSubmitting, setSupportSubmitting] = useState<boolean>(false);
  const [supportSuccess, setSupportSuccess] = useState<{
    ticketId: string;
    whatsappText: string;
    whatsappUrl: string;
  } | null>(null);

  // Fetch Order
  const fetchOrder = React.useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/orders?id=${orderId}`);
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
      } else {
        setErrorMsg("Order not found");
      }
    } catch (err) {
      console.error("Failed to load order tracker:", err);
      setErrorMsg("Failed to connect to order tracking service");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Parse bundle products
  const items: BundleItem[] = useMemo(() => {
    if (!order?.bundleProducts) return [];
    try {
      const parsed = JSON.parse(order.bundleProducts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [order?.bundleProducts]);

  // Computed per-item timelines and find the slowest product
  const productTimelines = useMemo(() => {
    const baseDate = new Date(`${REFERENCE_DATE_STR}T00:00:00Z`);

    if (items.length === 0) {
      const defaultProduct = DEFAULT_CATALOGUE.find((p) => p.product_id === "P01");
      const days = defaultProduct?.typical_install_days || 5;
      const expDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
      return [
        {
          productId: "P01",
          name: "Biz Fibre 100",
          category: "Connectivity",
          quantity: 1,
          monthlyPrice: 999,
          installDays: days,
          expectedDate: formatDateGB(expDate),
          isSlowest: true,
        },
      ];
    }

    let maxDays = 0;
    const mapped = items.map((item) => {
      const pid = item.productId || item.id || "P01";
      const catProduct = DEFAULT_CATALOGUE.find((p) => p.product_id === pid);
      const days = catProduct?.typical_install_days || 5;
      if (days > maxDays) maxDays = days;

      const expDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
      return {
        productId: pid,
        name: item.productName || item.name || catProduct?.product_name || "Business Telecom Service",
        category: catProduct?.category || "Connectivity",
        quantity: item.quantity || item.qty || 1,
        monthlyPrice: item.monthlyPrice || item.unitPrice || catProduct?.price_min_inr_per_month || 0,
        installDays: days,
        expectedDate: formatDateGB(expDate),
        isSlowest: false,
      };
    });

    // Mark the slowest item(s)
    for (const p of mapped) {
      if (p.installDays === maxDays) {
        p.isSlowest = true;
        break;
      }
    }

    return mapped;
  }, [items]);

  // Slowest item driving the whole order completion date
  const slowestItem = useMemo(() => {
    const slowest = productTimelines.find((p) => p.isSlowest) || productTimelines[0];
    const baseDate = new Date(`${REFERENCE_DATE_STR}T00:00:00Z`);
    const days = slowest?.installDays || 5;
    const finalDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    // Compute install date window: 2 days before final date to final date
    const startWindow = new Date(baseDate.getTime() + Math.max(1, days - 2) * 24 * 60 * 60 * 1000);

    return {
      name: slowest?.name || "Biz Fibre Broadband",
      days,
      promiseDate: formatDateGB(finalDate),
      windowStart: formatDateGB(startWindow),
      windowEnd: formatDateGB(finalDate),
    };
  }, [productTimelines]);

  // Demo advance stage action
  async function handleAdvanceMilestone() {
    setAdvancing(true);
    try {
      const res = await fetch("/api/orders/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "advance" }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error("Failed to advance milestone:", err);
    } finally {
      setAdvancing(false);
    }
  }

  // Demo reset order action
  async function handleResetOrder() {
    setResetting(true);
    try {
      const res = await fetch("/api/orders/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "reset" }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error("Failed to reset order:", err);
    } finally {
      setResetting(false);
    }
  }

  // Support Ticket submission
  async function handleSubmitSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setSupportSubmitting(true);
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          category: supportCategory,
          details: supportDetails || "Please contact customer regarding order status.",
          contactPhone: order.contactPhone,
          contactName: order.contactName,
          businessName: order.businessName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSupportSuccess({
          ticketId: data.ticketId,
          whatsappText: data.whatsappText,
          whatsappUrl: data.whatsappUrl,
        });
        // Refresh order to reflect the support event in timeline
        fetchOrder();
      }
    } catch (err) {
      console.error("Failed to submit support ticket:", err);
    } finally {
      setSupportSubmitting(false);
    }
  }

  // Copy referral link
  function handleCopyReferral() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/?ref=${orderId}` : "";
    navigator.clipboard.writeText(url);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  }

  // Copy WhatsApp text
  function handleCopyWhatsApp(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedSupport(true);
    setTimeout(() => setCopiedSupport(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <JourneyProgressBar
          currentStage="TRACKER"
          sessionId={sessionId}
          orderId={orderId}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <RefreshCw className="w-8 h-8 text-red-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700">Connecting to Airtel Telecom Provisioning Gateway...</p>
          <span className="text-xs text-slate-400 mt-1">Retrieving live network telemetry</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Order Tracker Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mb-4">
          Could not locate order ID &quot;{orderId}&quot;. Please verify the order number or enter your mobile number.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 hover:bg-red-700 transition-colors"
        >
          Return to Home Page
        </Link>
      </div>
    );
  }

  // Exact 5 Canonical Stages requested:
  // 1. Quote accepted -> 2. KYC verified -> 3. Site survey/Installation scheduled -> 4. Installing -> 5. Activated
  const currentStatus = order.status;

  // Helper to map legacy status values
  const isKycDone = [
    "KYC_VERIFIED",
    "KYC_COMPLETE",
    "INSTALLATION_SCHEDULED",
    "DISPATCHED",
    "INSTALLING",
    "ACTIVE",
  ].includes(currentStatus);

  const isScheduledDone = [
    "INSTALLATION_SCHEDULED",
    "DISPATCHED",
    "INSTALLING",
    "ACTIVE",
  ].includes(currentStatus);

  const isInstallingDone = ["INSTALLING", "ACTIVE"].includes(currentStatus);
  const isActiveDone = currentStatus === "ACTIVE";

  // Determine current active stage index (0 to 4)
  let currentStageIndex = 0;
  if (isActiveDone) currentStageIndex = 4;
  else if (isInstallingDone) currentStageIndex = 3;
  else if (isScheduledDone) currentStageIndex = 2;
  else if (isKycDone) currentStageIndex = 1;
  else currentStageIndex = 0;

  // Stages configuration for vertical timeline
  const stages = [
    {
      key: "QUOTE_ACCEPTED",
      stageNumber: 1,
      title: "Quote accepted",
      description: "Quote accepted with transparent bundle pricing and recurring e-Mandate registration.",
      completed: true,
      isCurrent: currentStageIndex === 0,
      timestamp: "15 Jul 2026, 10:15 AM",
      eventMatch: order.events?.find((e) => e.status === "QUOTE_ACCEPTED"),
    },
    {
      key: "KYC_VERIFIED",
      stageNumber: 2,
      title: "KYC verified",
      description: "GSTIN, Udyam, and address proofs verified against registries. Agreement legally e-Signed.",
      completed: isKycDone,
      isCurrent: currentStageIndex === 1,
      timestamp: isKycDone ? "15 Jul 2026, 10:28 AM" : "Est: 15 Jul 2026",
      eventMatch: order.events?.find((e) => e.status === "KYC_VERIFIED" || e.status === "KYC_COMPLETE"),
    },
    {
      key: "INSTALLATION_SCHEDULED",
      stageNumber: 3,
      title: "Site survey/Installation scheduled",
      description: "Last-mile feasibility confirmed. Lead Field Engineer Ramesh Sharma assigned with installation slot.",
      completed: isScheduledDone,
      isCurrent: currentStageIndex === 2,
      timestamp: isScheduledDone ? "16 Jul 2026, 09:30 AM" : "Est: 16 Jul 2026",
      eventMatch: order.events?.find((e) => e.status === "INSTALLATION_SCHEDULED" || e.status === "DISPATCHED"),
    },
    {
      key: "INSTALLING",
      stageNumber: 4,
      title: "Installing",
      description: "On-site cable routed, fiber spliced to optical terminal unit, indoor Wi-Fi 6 router configured, static IP bound.",
      completed: isInstallingDone,
      isCurrent: currentStageIndex === 3,
      timestamp: isInstallingDone ? "17 Jul 2026, 11:00 AM" : "Est: 17 Jul 2026",
      eventMatch: order.events?.find((e) => e.status === "INSTALLING"),
    },
    {
      key: "ACTIVE",
      stageNumber: 5,
      title: "Activated",
      description: "Committed speed validated at 100% throughput. Live SLA monitoring active. Single consolidated bill generated.",
      completed: isActiveDone,
      isCurrent: currentStageIndex === 4,
      timestamp: isActiveDone ? "18 Jul 2026, 03:45 PM" : slowestItem.promiseDate,
      eventMatch: order.events?.find((e) => e.status === "ACTIVE"),
    },
  ];

  // Dynamic "What happens next" content based on stage
  const getWhatHappensNext = () => {
    switch (currentStageIndex) {
      case 0:
        return {
          title: "What happens next: Automated Regulatory Cross-Checks",
          text: "Our automated verification engine is cross-checking your uploaded documents, GSTIN status, and Udyam credentials with official government registries. You will receive an instant SMS once verified (typical turnaround: under 15 minutes).",
          badge: "Verification in Progress",
        };
      case 1:
        return {
          title: "What happens next: Fiber Feasibility & Engineer Allocation",
          text: "Your KYC is approved! Our network operations team is reserving a high-speed fiber port on your building's Airtel Distribution Point (DP). Field Engineer Ramesh Sharma will receive your appointment dispatch.",
          badge: "Port Reservation & Scheduling",
        };
      case 2:
        return {
          title: "What happens next: Engineer Visit & Last-Mile Cabling",
          text: "Field Engineer Ramesh Sharma (+91 98210 44321) will arrive at your premises during your scheduled installation window (10:00 AM – 1:00 PM). Please ensure access to your building shaft and intended router placement area.",
          badge: "Engineer Dispatched",
        };
      case 3:
        return {
          title: "What happens next: Optical Splicing & Throughput Handshake",
          text: "The technician is running indoor fiber termination, testing light-signal loss via OTDR, powering on the Wi-Fi 6 ONT, and binding your static IP address. Network activation test is 70% complete.",
          badge: "Provisioning On-Site",
        };
      case 4:
      default:
        return {
          title: "What happens next: Enterprise Live SLA & Single Unified Bill",
          text: "Your high-speed connection is 100% live and provisioned! Your first consolidated monthly bill is generated below. For any ongoing requests, your dedicated Airtel Business Relationship Manager Anita Roy is directly reachable.",
          badge: "Service 100% Live",
        };
    }
  };

  const whatHappensNext = getWhatHappensNext();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans">
      {/* 4-Stage Top Journey Progress Bar */}
      <JourneyProgressBar
        currentStage="TRACKER"
        sessionId={sessionId}
        orderId={orderId}
      />

      {/* ─── DEMO-ONLY TOP CONTROL BAR (?demo=1) ─── */}
      {isDemo && (
        <div className="bg-slate-900 text-white px-4 py-2.5 sticky top-0 z-30 shadow-md border-b border-amber-500/40">
          <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Judge Demo Control Bar (?demo=1)
              </span>
              <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono text-slate-300">
                Stage {currentStageIndex + 1}/5: {stages[currentStageIndex].title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetOrder}
                disabled={resetting || advancing}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                title="Reset order to Stage 1 (Quote Accepted)"
              >
                <RotateCcw className={`w-3 h-3 ${resetting ? "animate-spin" : ""}`} />
                <span>Reset</span>
              </button>

              <button
                onClick={handleAdvanceMilestone}
                disabled={advancing || resetting || currentStatus === "ACTIVE"}
                className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-xs ${
                  currentStatus === "ACTIVE"
                    ? "bg-emerald-700 text-emerald-100 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-500 text-white active:scale-95"
                }`}
              >
                {advancing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" /> Advancing...
                  </>
                ) : currentStatus === "ACTIVE" ? (
                  <>
                    <Check className="w-3 h-3" /> Fully Activated
                  </>
                ) : (
                  <>
                    Advance Stage <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className={`bg-white border-b border-slate-200 px-4 py-3 shadow-xs ${isDemo ? "" : "sticky top-0 z-20"}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-red-600/20">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 leading-tight">
                  Order Fulfillment Tracker
                </h1>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {order.id}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {order.businessName} • {order.city || "India"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                order.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  order.status === "ACTIVE" ? "bg-emerald-600" : "bg-blue-600 animate-pulse"
                }`}
              />
              {order.status === "ACTIVE" ? "ACTIVATED" : "IN PROGRESS"}
            </span>

            {/* "Something wrong?" Button */}
            <button
              onClick={() => {
                setSupportSuccess(null);
                setIsSupportOpen(true);
              }}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Something wrong?</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        {/* ─── HERO CARD: TARGET COMPLETION & SLOWEST ITEM GUARANTEE ─── */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Estimated Order Fulfillment
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                {order.status === "ACTIVE" ? "All Services Active & Live" : slowestItem.promiseDate}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Install Date Window: <strong>{slowestItem.windowStart} – {slowestItem.windowEnd}</strong>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Consolidated Monthly</span>
              <p className="text-xl font-black text-slate-900">
                ₹{order.monthlyTotal.toLocaleString("en-IN")}
                <span className="text-xs font-normal text-slate-500">/mo + GST</span>
              </p>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-0.5">
                Auto-Pay Active
              </span>
            </div>
          </div>

          {/* Honest SLA Disclosure Callout (Slowest item requirement) */}
          <div className="mt-4 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900">
                Honest SLA Guarantee (Complete when slowest item is done):
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                Your order target date is determined by the slowest item in your bundle:{" "}
                <strong>{slowestItem.name}</strong> ({slowestItem.days} business days). Faster items
                (like Postpaid SIMs or Cloud tools) are provisioned and dispatched earlier.
              </p>
            </div>
          </div>
        </div>

        {/* ─── "WHAT HAPPENS NEXT" DYNAMIC CALLOUT ─── */}
        <div className="bg-linear-to-r from-red-50 to-orange-50 border border-red-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-900">
                {whatHappensNext.title}
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-red-700 border border-red-200 shadow-2xs">
              {whatHappensNext.badge}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {whatHappensNext.text}
          </p>
        </div>

        {/* ─── FIELD ENGINEER CONTACT CARD (Once Scheduled / Installing / Active) ─── */}
        {isScheduledDone && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold flex flex-col items-center justify-center shrink-0 shadow-sm">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-[8px] tracking-tighter text-slate-300">ENGINEER</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-slate-900">Ramesh Sharma</h4>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Lead Field Engineer
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fleet Vehicle: <span className="font-mono text-slate-700">DL-12-AB-3421</span> • ID: AT-ENG-8402
                </p>
                <p className="text-xs text-slate-600 font-mono mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> +91 98210 44321
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              <a
                href="tel:+919821044321"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-slate-700" /> Call
              </a>
              <a
                href={`https://wa.me/919821044321?text=${encodeURIComponent(
                  `Hi Ramesh, this is ${order.contactName} regarding order ${order.id}. Could you confirm your estimated arrival time?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* ─── VERTICAL TIMELINE WITH CHECK MARKS ─── */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Order Lifecycle Timeline
              </h3>
              <p className="text-xs text-slate-500">
                5-Stage Guaranteed Provisioning Sequence
              </p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Zero Status Chases
            </span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {stages.map((stage) => {
              const isDone = stage.completed;
              const isCurrent = stage.isCurrent;

              return (
                <div key={stage.key} className="relative group">
                  {/* Step Marker */}
                  <div
                    className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isDone
                        ? "bg-emerald-600 text-white ring-4 ring-white"
                        : isCurrent
                        ? "bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse"
                        : "bg-slate-200 text-slate-500 ring-4 ring-white"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <span>{stage.stageNumber}</span>
                    )}
                  </div>

                  {/* Stage Content */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-blue-50/60 border-blue-200 shadow-xs"
                        : isDone
                        ? "bg-slate-50/80 border-slate-200"
                        : "bg-white border-slate-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-xs font-bold ${
                              isDone || isCurrent ? "text-slate-900" : "text-slate-500"
                            }`}
                          >
                            {stage.title}
                          </h4>
                          {isCurrent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white uppercase tracking-wider">
                              In Progress
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                          {stage.description}
                        </p>
                      </div>

                      <span className="text-[10px] font-mono font-medium text-slate-500 shrink-0">
                        {stage.timestamp}
                      </span>
                    </div>

                    {/* Associated Event details if available */}
                    {stage.eventMatch && stage.eventMatch.description && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{stage.eventMatch.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── PER-PRODUCT LINE MINI-TIMELINES (Slowest Item Logic) ─── */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Itemized Product Lines & Delivery Windows
              </h3>
              <p className="text-xs text-slate-500">
                Independent mini-timelines computed from typical install days
              </p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {productTimelines.length} {productTimelines.length === 1 ? "Line" : "Lines"}
            </span>
          </div>

          <div className="space-y-3">
            {productTimelines.map((prod, idx) => {
              // Item progress state
              const itemDone =
                isActiveDone ||
                (isInstallingDone && prod.installDays <= 3) ||
                (isScheduledDone && prod.installDays <= 1);

              const itemInProgress = !itemDone && (isScheduledDone || isInstallingDone);

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    prod.isSlowest
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {prod.name}
                        </span>
                        {prod.quantity > 1 && (
                          <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border">
                            Qty: {prod.quantity}
                          </span>
                        )}
                        {prod.isSlowest && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            Slowest Item (Sets Final Date)
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {prod.category} • Typical Setup SLA: <strong>{prod.installDays} business days</strong>
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-slate-500 block">
                        Expected: {prod.expectedDate}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                          itemDone
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : itemInProgress
                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {itemDone ? "✓ Ready / Active" : itemInProgress ? "⚙ Provisioning" : "Queued"}
                      </span>
                    </div>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        itemDone
                          ? "bg-emerald-600 w-full"
                          : itemInProgress
                          ? "bg-blue-600 w-2/3"
                          : "bg-slate-300 w-1/4"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── POST-ACTIVATION: SINGLE BILL & SINGLE SUPPORT NUMBER ─── */}
        {isActiveDone && (
          <div className="space-y-4">
            {/* 1. Single Consolidated Bill */}
            <div className="bg-white rounded-2xl p-5 border-2 border-emerald-500/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Single Consolidated Airtel Bill
                    </h3>
                    <p className="text-xs text-slate-500">
                      Billing Account Number: <strong className="font-mono text-slate-800">BAN-8402-9912</strong>
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Auto-Pay Active
                </span>
              </div>

              {/* Itemized lines */}
              <div className="space-y-2 text-xs">
                {productTimelines.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700">
                      {p.name} {p.quantity > 1 ? `(x${p.quantity})` : ""}
                    </span>
                    <span className="font-mono text-slate-900">
                      ₹{(p.monthlyPrice * p.quantity).toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-2 text-slate-500 text-[11px]">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{order.monthlyTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 text-[11px]">
                  <span>GST (18%):</span>
                  <span className="font-mono">₹{(order.monthlyTotal * 0.18).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t-2 border-slate-900 text-sm font-bold text-slate-900">
                  <span>Total Monthly Invoice:</span>
                  <span className="font-mono text-emerald-700">
                    ₹{(order.monthlyTotal * 1.18).toLocaleString("en-IN")}/mo
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Next auto-debit: <strong>01 Aug 2026 via e-NACH</strong>
                </span>
                <button
                  onClick={() => alert("Downloading official Airtel GST Tax Invoice (PDF)...")}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF Bill
                </button>
              </div>
            </div>

            {/* 2. Single Dedicated Support Number & Relationship Manager */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Single Dedicated Support Desk
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  4-Hour SLA Commitment
                </span>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-white">
                  Anita Roy — Dedicated Relationship Manager
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  No IVR phone menus or generic queue delays. Your business has a direct enterprise single-window contact for all connectivity, billing, and add-on needs.
                </p>
              </div>

              <div className="p-3 bg-white/10 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Single Support Helpline</span>
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    +91 800-AIRTEL-BIZ (1800-103-0101)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="tel:18001030101"
                    className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-slate-100 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call RM
                  </a>
                  <a
                    href={`https://wa.me/919821044321?text=${encodeURIComponent(
                      `Hello Anita, this is ${order.contactName} (${order.businessName}) regarding my activated Airtel Business account ${order.id}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp RM
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── REFERRAL CARD (14.8% Conversion Driver) ─── */}
        <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl p-5 text-white shadow-md shadow-red-600/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                MSME Neighbor Referral Program
              </span>
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
              1 Month Free Waiver
            </span>
          </div>

          <div>
            <h3 className="text-base font-extrabold leading-tight">
              Refer a neighbouring business — both get 1 Month Free!
            </h3>
            <p className="text-xs text-white/90 mt-1 leading-normal">
              Empower other shops in your commercial complex with high-speed fiber. When they onboard via your link, both businesses receive a 100% waiver on next month’s bill.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 bg-white/10 backdrop-blur-xs px-3 py-2 rounded-xl text-xs font-mono truncate border border-white/20">
              accelbusiness.in/?ref={order.id}
            </div>
            <button
              onClick={handleCopyReferral}
              className="px-3.5 py-2 bg-white text-red-600 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-red-50 transition-colors"
            >
              {copiedRef ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* ─── "SOMETHING WRONG?" MODAL / ZERO-CALL WHATSAPP RESOLVER ─── */}
      {isSupportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsSupportOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {!supportSuccess ? (
              <form onSubmit={handleSubmitSupport} className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-red-600 font-bold text-sm mb-1">
                    <HelpCircle className="w-4 h-4" />
                    <span>How can we assist with your order?</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    We resolve fulfillment issues directly over WhatsApp with a guaranteed 15-minute response — zero IVR phone holds.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Issue Category
                  </label>
                  <select
                    value={supportCategory}
                    onChange={(e) => setSupportCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 outline-none focus:border-red-500 font-medium"
                  >
                    <option value="Reschedule installation slot">📅 Reschedule installation slot</option>
                    <option value="Address or premises update">📍 Address or premises update</option>
                    <option value="KYC / Document clarification">📄 KYC / Document clarification</option>
                    <option value="Technical requirements / Static IP">🛠 Technical requirements / Static IP</option>
                    <option value="Billing mandate question">💳 Billing mandate question</option>
                    <option value="Other request">❓ Other request</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Details / Preferred Timing
                  </label>
                  <textarea
                    rows={3}
                    value={supportDetails}
                    onChange={(e) => setSupportDetails(e.target.value)}
                    placeholder="e.g. Please reschedule engineer visit to tomorrow afternoon between 2 PM - 5 PM..."
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 outline-none focus:border-red-500"
                    required
                  />
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    A ticket will be generated and dispatched directly to Lead Engineer Ramesh Sharma on WhatsApp.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSupportOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={supportSubmitting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                  >
                    {supportSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                      </>
                    ) : (
                      <>
                        Create Ticket & Open WhatsApp <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>

                <div className="text-center">
                  <h3 className="text-sm font-black text-slate-900">
                    Support Ticket Created: {supportSuccess.ticketId}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your request has been logged. Send this pre-formatted message on WhatsApp for 15-minute priority resolution.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {supportSuccess.whatsappText}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href={supportSuccess.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" /> Open in WhatsApp
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyWhatsApp(supportSuccess.whatsappText)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedSupport ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied to Clipboard
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy WhatsApp Message
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderTrackerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
          <RefreshCw className="w-8 h-8 text-red-600 animate-spin mb-2" />
          <p className="text-xs font-semibold text-slate-500">Loading order tracker...</p>
        </div>
      }
    >
      <TrackerContent />
    </Suspense>
  );
}
