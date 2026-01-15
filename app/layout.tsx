import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LaakarinTyopoyta",
  description: "Lääkärin työpöytä - Kapustin.fi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fi">
      <body>{children}</body>
    </html>
  );
}
