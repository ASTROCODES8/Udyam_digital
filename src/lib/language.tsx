"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "hi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    brand_title: "Accel Business",
    brand_subtitle: "Udyam Digital",
    advisor: "AI Advisor",
    quote: "Quote",
    kyc: "Smart KYC",
    track: "Track Order",
    admin: "Partner / Sales CRM",
    switch_lang: "हिन्दी",
    current_lang: "EN",
    tagline: "Empowering 6 Crore+ Indian MSMEs to Go Digital in One Sitting",
  },
  hi: {
    brand_title: "एक्सेल बिजनेस",
    brand_subtitle: "उद्यम डिजिटल",
    advisor: "एआई सलाहकार",
    quote: "कोटेशन",
    kyc: "स्मार्ट केवाईसी",
    track: "ऑर्डर ट्रैक करें",
    admin: "पार्टनर / सेल्स सीआरएम",
    switch_lang: "English",
    current_lang: "हिं",
    tagline: "भारत के ६ करोड़+ छोटे उद्योगों के लिए एक बैठक में संपूर्ण डिजिटल समाधान",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (k: string) => k,
});

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};path=/;expires=${date.toUTCString()};SameSite=Lax`;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = getCookie("udyam_lang") as Language | null;
    if (saved === "en" || saved === "hi") {
      setLangState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    setCookie("udyam_lang", lang);
  };

  const toggleLanguage = () => {
    const next = language === "en" ? "hi" : "en";
    setLanguage(next);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
