"use client";
import { SessionProvider } from "next-auth/react";
import PasswordChangeGuard from "./PasswordChangeGuard";
import { I18nProvider } from "./I18nProvider";
import TemplatesI18nEnhancer from "./TemplatesI18nEnhancer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <PasswordChangeGuard />
        <TemplatesI18nEnhancer />
        {children}
      </I18nProvider>
    </SessionProvider>
  );
}
