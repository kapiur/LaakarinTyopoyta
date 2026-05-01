"use client";
import { SessionProvider } from "next-auth/react";
import PasswordChangeGuard from "./PasswordChangeGuard";
import { I18nProvider } from "./I18nProvider";
import MalliSyntaxHelpEnhancer from "./MalliSyntaxHelpEnhancer";
import CoreUiI18nEnhancer from "./CoreUiI18nEnhancer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <PasswordChangeGuard />
        <MalliSyntaxHelpEnhancer />
        <CoreUiI18nEnhancer />
        {children}
      </I18nProvider>
    </SessionProvider>
  );
}
