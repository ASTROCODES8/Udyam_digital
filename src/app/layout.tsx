import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/Header";
import { LanguageProvider } from "@/lib/language";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Accel Business — Udyam Digital",
  description:
    "Empowering India's MSMEs to discover, customize, and activate business bundles in one sitting.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 text-gray-900 min-h-screen flex flex-col items-center justify-start`}
      >
        <LanguageProvider>
          {/* Mobile-first centered shell: full width on mobile, max 480px-520px or fluid on desktop */}
          <div className="w-full max-w-lg min-h-screen bg-white shadow-xl flex flex-col relative border-x border-gray-200">
            <Header />
            <main className="flex-1 flex flex-col">{children}</main>
            <footer className="py-4 px-6 text-center text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
              <p>Accel Business • Project Udyam Digital</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Compliant with DPDP Act 2023 • Reference Date: 2026-07-15
              </p>
            </footer>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
