import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "../components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lääkärin Työpöytä",
  description: "Työkalut lääkärin arkeen",
  applicationName: "Lääkärin Työpöytä",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lääkärin Työpöytä",
  },
  icons: {
    icon: "/icons/app-icon.svg",
    apple: "/icons/app-icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className="antialiased">
      <body className={`${inter.className} min-h-[100dvh] bg-slate-50 text-slate-900`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
