"use client";

import React, { useState } from "react";
import { Phone, X, Check, RefreshCw, MessageSquare, Clock } from "lucide-react";
import { getSessionToken, getStoredOrderId } from "@/lib/sessionClient";

interface CallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultPhone?: string;
  defaultBusiness?: string;
}

export default function CallbackModal({
  isOpen,
  onClose,
  defaultName = "",
  defaultPhone = "",
  defaultBusiness = "",
}: CallbackModalProps) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [businessName, setBusinessName] = useState(defaultBusiness);
  const [slot, setSlot] = useState("Immediate (within 15 mins)");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState<{
    callbackId: string;
    whatsappText: string;
    whatsappUrl: string;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!name.trim() || cleanPhone.length < 10) {
      setErrorMsg("Please provide your name and a valid 10-digit mobile number.");
      return;
    }

    setSubmitting(true);
    try {
      const sessionId = getSessionToken();
      const orderId = getStoredOrderId();

      const res = await fetch("/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          businessName: businessName.trim(),
          preferredSlot: slot,
          notes: notes.trim(),
          sessionId,
          orderId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessData({
          callbackId: data.callbackId,
          whatsappText: data.whatsappText,
          whatsappUrl: data.whatsappUrl,
          message: data.message,
        });
      } else {
        setErrorMsg(data.error || "Failed to schedule callback. Please try again.");
      }
    } catch (err) {
      console.error("Callback submission error:", err);
      setErrorMsg("Connection issue. Please verify your internet and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-200 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!successData ? (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-600/20">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                  Talk to an Airtel Business Advisor
                </h3>
                <p className="text-xs text-gray-500">
                  Prefer speaking with a field expert? We will call you back.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Your Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-red-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                10-Digit Mobile Number *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs sm:text-sm text-gray-400 font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="98765 00000"
                  required
                  className="w-full min-h-[44px] pl-11 pr-3.5 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-red-500 focus:bg-white font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Business / Enterprise Name (Optional)
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Balaji Enterprises"
                className="w-full min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-red-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Preferred Callback Slot
              </label>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-red-500 font-medium"
              >
                <option value="Immediate (within 15 mins)">⚡ Immediate (within 15 mins)</option>
                <option value="Today afternoon (2 PM - 5 PM)">☀️ Today afternoon (2 PM - 5 PM)</option>
                <option value="Tomorrow morning (10 AM - 1 PM)">🌅 Tomorrow morning (10 AM - 1 PM)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Notes / What would you like to discuss?
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Need help with fiber cabling feasibility or GSTIN verification..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-red-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-xl text-[11px] text-red-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                Zero queue wait. A local Airtel enterprise field specialist will call you directly.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Scheduling...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" /> Request Callback
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-base font-black text-gray-900">
                Callback Confirmed: {successData.callbackId}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {successData.message}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono text-[11px] text-left text-gray-700 whitespace-pre-wrap">
              {successData.whatsappText}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <a
                href={successData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> Connect Directly on WhatsApp
              </a>

              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] w-full py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
