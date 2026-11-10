"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search, ArrowRight, PackageCheck } from "lucide-react";

interface RecentOrder {
  id: string;
  businessName?: string;
  contactName?: string;
  status: string;
}

export default function TrackLandingPage() {
  const router = useRouter();
  const [orderIdInput, setOrderIdInput] = useState("");
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (data.orders && data.orders.length > 0) {
          setRecentOrders(data.orders);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadRecent();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (orderIdInput.trim()) {
      router.push(`/track/${orderIdInput.trim().toUpperCase()}`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4">
      <div className="max-w-md mx-auto mt-12 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <PackageCheck className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Track Your Connection Order
          </h1>
          <p className="text-xs text-slate-500">
            Enter your Accel Business Order ID to view real-time provisioning & technician status.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value.toUpperCase())}
              placeholder="e.g. ORD-9979"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm tracking-wider uppercase focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            type="submit"
            disabled={!orderIdInput.trim()}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" /> Track Order Status
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center p-4">
            <RefreshCw className="w-5 h-5 text-red-600 animate-spin" />
          </div>
        ) : recentOrders.length > 0 ? (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Recent Active Orders:
            </p>
            <div className="space-y-1.5">
              {recentOrders.slice(0, 3).map((ord) => (
                <button
                  key={ord.id}
                  onClick={() => router.push(`/track/${ord.id}`)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900">
                      {ord.id}
                    </span>
                    <span className="text-slate-500 ml-2">
                      {ord.businessName || ord.contactName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        ord.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {ord.status}
                    </span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
