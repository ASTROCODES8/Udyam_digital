"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/language";
import type { AdvisorMessage, RecommendationPayload, BusinessProfileData } from "@/lib/llm/schema";
import JourneyProgressBar from "@/components/JourneyProgressBar";
import { getSessionToken, setSessionToken, getStoredOrderId } from "@/lib/sessionClient";
import {
  Send,
  Mic,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  TrendingDown,
  Layers,
  Truck,
  KeyRound,
  X,
} from "lucide-react";

interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export default function AdvisorPage() {
  const { language, setLanguage } = useLanguage();

  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<BusinessProfileData>({});
  const [latestRecommendation, setLatestRecommendation] = useState<RecommendationPayload | null>(null);

  // Resume where you left off state
  const [resumeSession, setResumeSession] = useState<{
    id: string;
    businessName?: string;
    resumeStep: string;
    resumeUrl: string;
    orderId?: string | null;
  } | null>(null);

  // 3 Seeded Demo Personas (Home Page requirement)
  const demoPersonas = [
    {
      id: "kirana",
      emoji: "🏪",
      label: "Kirana owner (Hindi)",
      lang: "hi" as const,
      message:
        "मेरी लखनऊ में किराना दुकान है, 2 कर्मचारी हैं। मुझे तेज़ ब्रॉडबैंड, यूपीआई बिलिंग पीओएस और इन्वेंट्री ट्रैकर चाहिए।",
      profile: {
        businessName: "Sharma Kirana Store",
        businessType: "Kirana / Retail",
        segment: "retail",
        city: "Lucknow",
        cityTier: 2,
        employeeCount: 2,
        numSites: 1,
        currentSpend: 1500,
      },
    },
    {
      id: "clinic",
      emoji: "🏥",
      label: "Clinic (English)",
      lang: "en" as const,
      message:
        "I run a diagnostic clinic and lab in Pune with 8 staff. We need reliable fiber broadband, patient records backup, and a static IP.",
      profile: {
        businessName: "CarePlus Diagnostic Clinic",
        businessType: "Clinic / Diagnostics",
        segment: "prof",
        city: "Pune",
        cityTier: 1,
        employeeCount: 8,
        numSites: 1,
        hasGstin: true,
        currentSpend: 3500,
      },
    },
    {
      id: "restaurant",
      emoji: "🍽️",
      label: "Restaurant chain (Tamil)",
      lang: "en" as const,
      message:
        "We manage a multi-site restaurant chain in Chennai across 3 locations with 25 employees. We need cloud POS, high-speed Wi-Fi with guest portal, and centralized billing.",
      profile: {
        businessName: "Annalakshmi Multi-Site Kitchens",
        businessType: "Restaurant Chain",
        segment: "hospitality",
        city: "Chennai",
        cityTier: 1,
        employeeCount: 25,
        numSites: 3,
        currentSpend: 8000,
      },
    },
  ];

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Track Order (Mobile + OTP) state
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackPhone, setTrackPhone] = useState("");
  const [trackOtp, setTrackOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);
  const [matchedOrders, setMatchedOrders] = useState<
    Array<{
      id: string;
      businessName: string;
      contactName: string;
      status: string;
      monthlyTotal: number;
    }>
  >([]);
  const [trackError, setTrackError] = useState("");

  const handleSendOtp = () => {
    const clean = trackPhone.replace(/[^0-9]/g, "");
    if (clean.length < 10) {
      setTrackError("Please enter a valid 10-digit mobile number");
      return;
    }
    setTrackError("");
    setTrackLoading(true);
    setTimeout(() => {
      setOtpSent(true);
      setTrackOtp("123456"); // Pre-fill demo OTP
      setTrackLoading(false);
    }, 400);
  };

  const handleVerifyOtpAndSearch = async () => {
    if (!trackOtp || trackOtp.trim().length !== 6) {
      setTrackError("Please enter the 6-digit OTP");
      return;
    }
    setTrackError("");
    setTrackLoading(true);
    try {
      const clean = trackPhone.replace(/[^0-9]/g, "");
      const res = await fetch(`/api/orders?phone=${clean}`);
      const data = await res.json();
      if (data.orders && data.orders.length > 0) {
        setMatchedOrders(data.orders);
      } else {
        // Fallback: fetch recent orders so customer can track active orders
        const recRes = await fetch("/api/orders");
        const recData = await recRes.json();
        setMatchedOrders(recData.orders || []);
      }
    } catch (err) {
      console.error("Order track search error:", err);
      setTrackError("Failed to lookup orders. Please check your connection.");
    } finally {
      setTrackLoading(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Setup initial greeting and speech recognition
  useEffect(() => {
    // Generate or restore session ID
    let currentSession = getSessionToken();
    if (!currentSession) {
      currentSession = "sess_" + Math.random().toString(36).substring(2, 10);
      setSessionToken(currentSession);
    }
    setSessionId(currentSession);

    // Check for previous session state to offer resume
    fetch(`/api/session/resume?token=${currentSession}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.session && (data.session.resumeStep !== "ADVISOR" || data.session.orderId)) {
          setResumeSession(data.session);
        }
      })
      .catch(() => {});

    // Initial greeting message
    const isHi = language === "hi";
    setMessages([
      {
        id: "msg_init",
        role: "model",
        content: isHi
          ? "नमस्ते! मैं एक्सेल बिजनेस का डिजिटल सलाहकार हूँ। हम 15 मिनट में आपके व्यवसाय के लिए सही डिजिटल और ब्रॉडबैंड प्लान तैयार कर सकते हैं। आपका किस प्रकार का व्यवसाय है?"
          : "Hello! I am Accel Business's digital advisor. In just a few questions, we can configure the perfect connectivity and software bundle for your business in one sitting. What kind of business do you run?",
        quickReplies: isHi
          ? ["किराना / रिटेल शॉप", "डॉक्टर क्लिनिक / लैब", "सीए / कंसल्टिंग ऑफिस", "मल्टी-स्टोर रिटेल", "छोटी फैक्ट्री"]
          : ["Kirana / Retail Store", "Doctor Clinic / Lab", "CA / Consulting Office", "Multi-site Retail", "Small Manufacturing"],
      },
    ]);

    // Initialize Web Speech API
    if (typeof window !== "undefined") {
      const windowObj = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      };
      const SpeechClass = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;
      if (SpeechClass) {
        setSpeechSupported(true);
        const recog = new SpeechClass();
        recog.continuous = false;
        recog.interimResults = false;

        recog.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsListening(false);
        };

        recog.onerror = () => {
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recog;
      }
    }
  }, [language]);

  // Handle Speech Toggle
  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Map current language to BCP 47 locale
      const langCode = language === "hi" ? "hi-IN" : "en-IN";
      recognitionRef.current.lang = langCode;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition start failed:", err);
      }
    }
  };

  // Select a Seeded Demo Persona
  const handleSelectPersona = (p: (typeof demoPersonas)[0]) => {
    if (p.lang !== language) {
      setLanguage(p.lang);
    }
    setProfile(p.profile);
    handleSendMessage(p.message, p.profile);
  };

  // Send message to API
  const handleSendMessage = async (textToSend?: string, profileOverride?: BusinessProfileData) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg: AdvisorMessage = {
      id: "usr_" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    const effectiveProfile = profileOverride || profile;

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text,
          history: messages,
          language,
          profile: effectiveProfile,
        }),
      });

      const data = await res.json();

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        setSessionToken(data.sessionId);
        localStorage.setItem("udyam_advisor_session", data.sessionId);
      }

      if (data.profile) {
        setProfile(data.profile);
      }

      const modelMsg: AdvisorMessage = {
        id: "mod_" + Date.now(),
        role: "model",
        content: data.reply,
        timestamp: new Date().toISOString(),
        quickReplies: data.quickReplies || [],
        recommendation: data.recommendation,
      };

      setMessages((prev) => [...prev, modelMsg]);

      if (data.recommendation) {
        setLatestRecommendation(data.recommendation);
      }
    } catch (err) {
      console.error("Failed to reach advisor API:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: "err_" + Date.now(),
          role: "model",
          content:
            language === "hi"
              ? "माफ़ कीजिए, नेटवर्क में कुछ रुकावट आई। कृपया दोबारा प्रयास करें।"
              : "Apologies, there was a connection issue. Please try again.",
          quickReplies: ["Retry / पुनः प्रयास"],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    const newSession = "sess_" + Math.random().toString(36).substring(2, 10);
    setSessionId(newSession);
    localStorage.setItem("udyam_advisor_session", newSession);
    setProfile({});
    setLatestRecommendation(null);
    const isHi = language === "hi";
    setMessages([
      {
        id: "msg_init_reset",
        role: "model",
        content: isHi
          ? "नमस्ते! आपका किस प्रकार का व्यवसाय है?"
          : "Hello! What kind of business do you run?",
        quickReplies: isHi
          ? ["किराना / रिटेल शॉप", "डॉक्टर क्लिनिक / लैब", "सीए / कंसल्टिंग ऑफिस", "मल्टी-स्टोर रिटेल", "छोटी फैक्ट्री"]
          : ["Kirana / Retail Store", "Doctor Clinic / Lab", "CA / Consulting Office", "Multi-site Retail", "Small Manufacturing"],
      },
    ]);
  };

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100vh-60px)] bg-gray-50/60 relative">
      {/* ─── 4-STAGE TOP JOURNEY PROGRESS BAR & MINUTES LEFT ─── */}
      <JourneyProgressBar
        currentStage="ADVISOR"
        sessionId={sessionId}
        orderId={getStoredOrderId() || undefined}
      />

      {/* ─── RESUME WHERE YOU LEFT OFF BANNER ─── */}
      {resumeSession && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <div>
              <span className="font-bold">Resume where you left off: </span>
              <span>
                {resumeSession.businessName || "Your business application"} is at Step {resumeSession.resumeStep}.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={resumeSession.resumeUrl}
              className="min-h-[36px] px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs"
            >
              <span>Resume</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={() => setResumeSession(null)}
              className="min-h-[36px] min-w-[36px] text-amber-700 hover:text-amber-900 text-xs flex items-center justify-center font-bold"
              aria-label="Dismiss resume banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Advisor Header Status Banner */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-gray-600 shadow-xs">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-semibold text-gray-800 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            {language === "hi" ? "एआई बिजनेस एडवाइजर" : "AI Business Advisor"}
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500 text-[11px] truncate max-w-[120px] xs:max-w-none">
            {profile.businessType || (language === "hi" ? "ज़रूरत पहचान" : "Needs Discovery")}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => {
              setIsTrackModalOpen(true);
              setOtpSent(false);
              setTrackError("");
              setMatchedOrders([]);
            }}
            className="min-h-[36px] px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors active:scale-95 shadow-2xs"
            title="Track existing order with Mobile + OTP"
          >
            <Truck className="w-3 h-3 text-red-600" />
            <span>{language === "hi" ? "ऑर्डर ट्रैक (OTP)" : "Track My Order (OTP)"}</span>
          </button>

          <button
            onClick={resetChat}
            className="min-h-[36px] text-gray-400 hover:text-red-600 flex items-center gap-1 text-[11px] p-1.5"
            title="Restart Conversation"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{language === "hi" ? "रीसेट" : "Reset"}</span>
          </button>
        </div>
      </div>

      {/* ─── 3 SEEDED DEMO PERSONAS (Home Page Requirement) ─── */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {language === "hi" ? "डेमो व्यवसाय चुनें (1-क्लिक):" : "Try as Demo Persona:"}
          </span>
          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            3-Min Demo Video Shortcuts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {demoPersonas.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPersona(p)}
              disabled={loading}
              className="min-h-[44px] p-2 bg-gray-50 hover:bg-red-50 hover:border-red-300 border border-gray-200 rounded-xl text-left transition-all active:scale-98 flex items-center gap-2 group disabled:opacity-50"
            >
              <span className="text-xl shrink-0">{p.emoji}</span>
              <div className="truncate min-w-0 flex-1">
                <span className="text-xs font-bold text-gray-800 group-hover:text-red-700 block truncate">
                  {p.label}
                </span>
                <span className="text-[10px] text-gray-500 truncate block">
                  {p.profile.city} • {p.profile.employeeCount} staff
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const isLatest = idx === messages.length - 1;

          return (
            <div key={msg.id || idx} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                  isUser
                    ? "bg-red-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200/80 rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
              </div>

              {/* Render Recommendation Card if Model Returned One */}
              {!isUser && msg.recommendation && msg.recommendation.ready && (
                <div className="w-full mt-3">
                  <div className="bg-white rounded-xl border-2 border-red-500/80 p-4 shadow-md overflow-hidden relative">
                    {/* Top Tag */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center space-x-1.5">
                        <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
                          {msg.recommendation.isCheaperAlternative ? "Budget Option" : "Recommended Bundle"}
                        </span>
                        <span className="text-xs text-gray-400 font-normal">•</span>
                        <span className="text-xs text-gray-500 font-medium">
                          {msg.recommendation.quote?.contract_months || 12} {language === "hi" ? "महीने अनुबंध" : "mo. contract"}
                        </span>
                      </div>
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                    </div>

                    {/* Bundle Title & Pricing */}
                    <div className="mt-2.5">
                      <h4 className="font-extrabold text-gray-900 text-base leading-tight">
                        {msg.recommendation.bundleName}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">{msg.recommendation.summary}</p>
                    </div>

                    {/* Big Transparent Pricing Box */}
                    <div className="mt-3 bg-red-50/70 border border-red-100 rounded-lg p-3 flex items-baseline justify-between">
                      <div>
                        <div className="flex items-baseline space-x-1">
                          <span className="text-2xl font-black text-red-600">
                            ₹{msg.recommendation.quote?.grand_monthly_total.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-gray-600 font-medium">/{language === "hi" ? "माह" : "mo"}</span>
                        </div>
                        <span className="text-[11px] text-gray-500 block">
                          ₹{msg.recommendation.quote?.monthly_total.toLocaleString("en-IN")} + 18% GST (₹
                          {msg.recommendation.quote?.gst_18pct.toLocaleString("en-IN")})
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-gray-500 block">{language === "hi" ? "सेटअप शुल्क" : "Setup fee"}</span>
                        <span className="text-xs font-bold text-gray-800">
                          {msg.recommendation.quote?.one_time_total === 0
                            ? language === "hi"
                              ? "मुफ्त (₹0)"
                              : "Free (₹0)"
                            : `₹${msg.recommendation.quote?.one_time_total.toLocaleString("en-IN")}`}
                        </span>
                      </div>
                    </div>

                    {/* Line Items Breakdown */}
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-red-500" />
                        <span>{language === "hi" ? "शामिल उत्पाद" : "Included Products"}</span>
                      </p>
                      <ul className="space-y-1.5 text-xs text-gray-700">
                        {msg.recommendation.quote?.lines.map((item) => (
                          <li key={item.productId} className="flex justify-between items-center py-0.5">
                            <span className="font-medium text-gray-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                              {item.productName}
                              {item.qty > 1 && (
                                <span className="text-gray-500 font-normal text-[11px]"> × {item.qty}</span>
                              )}
                            </span>
                            <span className="font-semibold text-gray-900">
                              ₹{item.monthlyTotal.toLocaleString("en-IN")}/{language === "hi" ? "माह" : "mo"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 3 Why Reasons */}
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        {language === "hi" ? "आपके लिए क्यों उपयुक्त:" : "Why this fits your business:"}
                      </p>
                      <ul className="space-y-1 text-xs text-gray-600">
                        {msg.recommendation.whyReasons.map((reason, rIdx) => (
                          <li key={rIdx} className="flex items-start space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Primary Call to Action */}
                    <div className="mt-4 pt-2">
                      <Link
                        href={`/quote?sessionId=${sessionId}&token=${sessionId}`}
                        className="w-full min-h-[44px] flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-transform active:scale-98 text-sm"
                      >
                        <span>{language === "hi" ? "कोटेशन और चेकआउट जारी रखें" : "Continue to Quote"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Reply Chips (Only for the latest message) */}
              {!isUser && isLatest && msg.quickReplies && msg.quickReplies.length > 0 && !loading && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                  {msg.quickReplies.map((chip, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => handleSendMessage(chip)}
                      className="text-xs bg-white hover:bg-red-50 border border-gray-300 hover:border-red-500 text-gray-700 hover:text-red-700 font-medium py-1 px-3 rounded-full shadow-2xs transition-colors active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Spinner Indicator */}
        {loading && (
          <div className="flex items-center space-x-2 text-gray-400 text-xs py-1">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-red-600 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-red-600 animate-bounce [animation-delay:0.4s]" />
            <span className="text-gray-500 text-[11px] ml-1">
              {language === "hi" ? "सलाहकार विश्लेषण कर रहा है..." : "Analyzing requirements..."}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Action: Cheaper Option or Quick Jump to Quote if Recommendation Exists */}
      {latestRecommendation && (
        <div className="px-4 py-1.5 bg-red-50/90 border-t border-red-100 flex items-center justify-between text-xs">
          <button
            onClick={() => handleSendMessage(language === "hi" ? "क्या कोई सस्ता विकल्प है?" : "Is there a cheaper option?")}
            className="text-red-700 hover:text-red-800 font-semibold flex items-center gap-1 active:scale-95"
          >
            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            <span>{language === "hi" ? "सस्ता विकल्प खोजें" : "Want cheaper option?"}</span>
          </button>

          <Link
            href={`/quote?sessionId=${sessionId}`}
            className="text-red-600 font-bold hover:underline flex items-center gap-0.5"
          >
            <span>{language === "hi" ? "कोटेशन पेज" : "Review Quote"}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Input Bar with Mic & Send */}
      <div className="bg-white border-t border-gray-200 p-2.5 sm:p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-1.5"
        >
          {/* Web Speech API Microphone Button */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2.5 rounded-full transition-all flex items-center justify-center shadow-xs active:scale-95 ${
                isListening
                  ? "bg-red-600 text-white animate-pulse ring-4 ring-red-200"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
              title={isListening ? "Listening... Click to stop" : "Speak your reply (Voice input)"}
              aria-label="Voice Input"
            >
              {isListening ? <Mic className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-gray-700" />}
            </button>
          )}

          {/* Text Input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              isListening
                ? language === "hi"
                  ? "सुन रहा हूँ... बोलिए..."
                  : "Listening... speak now..."
                : language === "hi"
                ? "यहाँ टाइप करें या बोलें..."
                : "Type your answer or speak..."
            }
            className="flex-1 bg-gray-50 border border-gray-300 focus:border-red-500 focus:bg-white rounded-full px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="p-2.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white transition-all shadow-md active:scale-95 flex items-center justify-center"
            title="Send Message"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* ─── TRACK MY ORDER MODAL (MOBILE + OTP) ─── */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setIsTrackModalOpen(false);
                setOtpSent(false);
                setMatchedOrders([]);
                setTrackError("");
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-red-600/20">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Track Your Airtel Business Order
                </h3>
                <p className="text-xs text-gray-500">
                  Verify your mobile number to view real-time provisioning
                </p>
              </div>
            </div>

            {trackError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {trackError}
              </div>
            )}

            {matchedOrders.length === 0 ? (
              <div className="space-y-4">
                {!otpSent ? (
                  <>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        10-Digit Registered Mobile Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-medium">
                          +91
                        </span>
                        <input
                          type="tel"
                          maxLength={10}
                          value={trackPhone}
                          onChange={(e) => setTrackPhone(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="98765 00001"
                          className="w-full pl-11 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-red-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Quick Demo Number Pickers */}
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">
                        Quick Demo Test Numbers:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setTrackPhone("9876500001")}
                          className="p-1.5 bg-gray-50 hover:bg-red-50 hover:border-red-300 border border-gray-200 rounded-lg text-left transition-colors"
                        >
                          <span className="font-bold text-gray-800 block truncate">Sneha Rao</span>
                          <span className="text-[10px] text-gray-500 font-mono">ORD-0001 (Active)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrackPhone("9876500002")}
                          className="p-1.5 bg-gray-50 hover:bg-red-50 hover:border-red-300 border border-gray-200 rounded-lg text-left transition-colors"
                        >
                          <span className="font-bold text-gray-800 block truncate">Prakash Shah</span>
                          <span className="text-[10px] text-gray-500 font-mono">ORD-0002 (Installing)</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={trackLoading || trackPhone.length < 10}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5 transition-all"
                    >
                      {trackLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          Send OTP <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                      <div className="flex items-center gap-1.5 font-bold">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                        <span>OTP Sent Successfully</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-1">
                        A verification code was sent to <strong>+91 {trackPhone}</strong>. Demo OTP is <strong>123456</strong>.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Enter 6-Digit OTP
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={trackOtp}
                        onChange={(e) => setTrackOtp(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="123456"
                        className="w-full text-center tracking-[0.5em] py-2 text-sm font-mono font-bold bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-red-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="w-1/3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyOtpAndSearch}
                        disabled={trackLoading || trackOtp.length !== 6}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                      >
                        {trackLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            Verify & View Orders <CheckCircle2 className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Matched Orders List */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">
                    Active Orders Found ({matchedOrders.length})
                  </span>
                  <button
                    onClick={() => {
                      setMatchedOrders([]);
                      setOtpSent(false);
                    }}
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    Change Phone
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {matchedOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 bg-gray-50 hover:bg-red-50/50 border border-gray-200 hover:border-red-300 rounded-xl transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-900 block">
                            {ord.businessName}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {ord.id} • Contact: {ord.contactName}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            ord.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                        <Link
                          href={`/track/${ord.id}`}
                          onClick={() => setIsTrackModalOpen(false)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                          <span>Track Fulfillment</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        <Link
                          href={`/track/${ord.id}?demo=1`}
                          onClick={() => setIsTrackModalOpen(false)}
                          className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100"
                        >
                          Demo Mode (?demo=1)
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
