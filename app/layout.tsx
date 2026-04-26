import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";
import Sidebar from "../components/Sidebar";
import CalculatorsTabEnhancer from "../components/CalculatorsTabEnhancer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lääkärin Työpöytä",
  description: "Työkalut lääkärin arkeen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fi" className="antialiased">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen`}>
        <Providers>
          <CalculatorsTabEnhancer />
          <div className="flex h-screen overflow-hidden">
            {/* Боковая панель навигации */}
            <Sidebar />
            
            {/* Основной контент */}
            <main className="flex-1 overflow-y-auto bg-slate-50 relative scroll-smooth">
              <div className="max-w-[1600px] mx-auto p-4 md:p-8">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
