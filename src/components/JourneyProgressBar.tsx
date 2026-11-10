"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Phone, Sparkles, FileText, ShieldCheck, Truck, Clock } from "lucide-react";
import CallbackModal from "./CallbackModal";

export type JourneyStage = "ADVISOR" | "QUOTE" | "KYC" | "TRACKER";

interface JourneyProgressBarProps {
  currentStage: JourneyStage;
  sessionId?: string;
  orderId?: string;
}

export default function JourneyProgressBar({
  currentStage,
  sessionId = "",
  orderId = "",
}: JourneyProgressBarProps) {
  const [isCallbackOpen, setIsCallbackOpen] = useState(false);

  const stages: Array<{
    key: JourneyStage;
    number: number;
    title: string;
    shortTitle: string;
    icon: typeof Sparkles;
    minutesLeft: string;
    href: string;
  }> = [
    {
      key: "ADVISOR",
      number: 1,
      title: "AI Advisor",
      shortTitle: "Advisor",
      icon: Sparkles,
      minutesLeft: "~10 mins left",
      href: sessionId ? `/?token=${sessionId}` : "/",
    },
    {
      key: "QUOTE",
      number: 2,
      title: "Plan & Quote",
      shortTitle: "Quote",
      icon: FileText,
      minutesLeft: "~7 mins left",
      href: sessionId ? `/quote?sessionId=${sessionId}&token=${sessionId}` : "/quote",
    },
    {
      key: "KYC",
      number: 3,
      title: "Smart KYC",
      shortTitle: "KYC",
      icon: ShieldCheck,
      minutesLeft: "~5 mins left",
      href: orderId ? `/kyc?orderId=${orderId}&token=${sessionId}` : "/kyc",
    },
    {
      key: "TRACKER",
      number: 4,
      title: "Fulfillment",
      shortTitle: "Tracker",
      icon: Truck,
      minutesLeft: "Live Provisioning",
      href: orderId ? `/track/${orderId}?token=${sessionId}` : "/track/ORD-0001",
    },
  ];

  const stageIndex = stages.findIndex((s) => s.key === currentStage);
  const activeStage = stages[stageIndex >= 0 ? stageIndex : 0];
  const progressPercent = Math.round(((stageIndex + 1) / 4) * 100);

  return (
    <>
      <div className="w-full bg-slate-900 text-white border-b border-slate-800 shadow-xs sticky top-0 z-40">
        {/* Top Mini Info Bar */}
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between text-[11px] font-medium border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">Digital Journey:</span>
            <span>Step {stageIndex + 1} of 4</span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-400 flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3 inline" />
              {activeStage.minutesLeft}
            </span>
          </div>

          {/* "Talk to a Person" Button */}
          <button
            onClick={() => setIsCallbackOpen(true)}
            className="min-h-[32px] px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
            title="Request a callback from an Airtel Business representative"
          >
            <Phone className="w-3 h-3 text-white" />
            <span className="hidden xs:inline">Talk to a person</span>
            <span className="xs:hidden">Call</span>
          </button>
        </div>

        {/* 4 Steps Horizontal Tracker */}
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2">
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            {stages.map((st, idx) => {
              const isPast = idx < stageIndex;
              const isCurrent = idx === stageIndex;
              const Icon = st.icon;

              return (
                <Link
                  key={st.key}
                  href={st.href}
                  className={`min-h-[44px] flex flex-col justify-center items-center px-1 py-1 rounded-xl transition-all text-center ${
                    isCurrent
                      ? "bg-slate-800 text-white ring-1 ring-red-500/80"
                      : isPast
                      ? "text-emerald-400 hover:bg-slate-800/50"
                      : "text-slate-400 opacity-60 pointer-events-none"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Icon className="w-3 h-3 text-slate-300 hidden xs:inline shrink-0" />
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        isPast
                          ? "bg-emerald-500 text-slate-900"
                          : isCurrent
                          ? "bg-red-600 text-white"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {isPast ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : st.number}
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold truncate">
                      <span className="sm:hidden">{st.shortTitle}</span>
                      <span className="hidden sm:inline">{st.title}</span>
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 truncate mt-0.5 hidden xs:block">
                    {st.minutesLeft}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Smooth Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-600 via-orange-500 to-emerald-500 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <CallbackModal
        isOpen={isCallbackOpen}
        onClose={() => setIsCallbackOpen(false)}
      />
    </>
  );
}
