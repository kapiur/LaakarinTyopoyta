import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "../components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lääkärin Työpöytä",
  description: "Työkalut lääkärin arkeen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className="antialiased">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
