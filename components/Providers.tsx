"use client";
import { SessionProvider } from "next-auth/react";
import PasswordChangeGuard from "./PasswordChangeGuard";
import { I18nProvider } from "./I18nProvider";
import MalliSyntaxHelpEnhancer from "./MalliSyntaxHelpEnhancer";
import PikaohjeetI18nEnhancer from "./PikaohjeetI18nEnhancer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <PasswordChangeGuard />
        <MalliSyntaxHelpEnhancer />
        <PikaohjeetI18nEnhancer />
        {children}
      </I18nProvider>
    </SessionProvider>
  );
}
