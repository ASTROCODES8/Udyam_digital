"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language";
import { Globe, ShieldCheck } from "lucide-react";

export default function Header() {
  const { language, toggleLanguage, t } = useLanguage();
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: t("advisor") },
    { href: "/quote", label: t("quote") },
    { href: "/kyc", label: t("kyc") },
    { href: "/track/ORD-0001", label: t("track") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
      {/* Top Banner / Brand Bar */}
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand & Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-105 transition-transform">
            A
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-gray-900 tracking-tight text-sm sm:text-base">
                Accel Business
              </span>
              <span className="text-gray-400 text-xs sm:text-sm font-normal">|</span>
              <span className="font-semibold text-red-600 text-xs sm:text-sm">
                Udyam Digital
              </span>
            </div>
            <span className="text-[10px] text-gray-500 flex items-center gap-1 -mt-0.5">
              <ShieldCheck className="w-3 h-3 text-green-600 inline" />
              <span>MSME Fast-Track</span>
            </span>
          </div>
        </Link>

        {/* Right Actions: Language Switcher */}
        <div className="flex items-center space-x-2">
          {/* Language Toggle Pill */}
          <button
            onClick={toggleLanguage}
            type="button"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-gray-300 hover:border-red-500 bg-gray-50 hover:bg-red-50/50 transition-colors text-xs font-semibold text-gray-700 hover:text-red-600 shadow-xs active:scale-95"
            title="Toggle Language / भाषा बदलें"
            aria-label="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-gray-500" />
            <span>
              {language === "en" ? (
                <>
                  <span className="text-red-600 font-bold">EN</span> / हिं
                </>
              ) : (
                <>
                  EN / <span className="text-red-600 font-bold">हिं</span>
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Journey Progress Tabs */}
      <div className="border-t border-gray-100 bg-gray-50/80 px-2 py-1">
        <div className="max-w-4xl mx-auto flex items-center justify-around text-xs">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href.split("/")[1] ? `/${link.href.split("/")[1]}` : link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`py-1 px-2 font-medium rounded transition-colors ${
                  isActive
                    ? "text-red-600 font-bold bg-red-50"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
