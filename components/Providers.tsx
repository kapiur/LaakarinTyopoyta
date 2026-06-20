"use client";
import { SessionProvider } from "next-auth/react";
import PasswordChangeGuard from "./PasswordChangeGuard";
import { I18nProvider } from "./I18nProvider";
import MalliSyntaxHelpEnhancer from "./MalliSyntaxHelpEnhancer";
import CoreUiI18nEnhancer from "./CoreUiI18nEnhancer";
import CalculatorsI18nEnhancer from "./CalculatorsI18nEnhancer";
import StandaloneCalculatorsI18nEnhancer from "./StandaloneCalculatorsI18nEnhancer";
import { CaseSessionProvider } from "./workspace/CaseSessionProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <CaseSessionProvider>
          <PasswordChangeGuard />
          <MalliSyntaxHelpEnhancer />
          <CoreUiI18nEnhancer />
          <CalculatorsI18nEnhancer />
          <StandaloneCalculatorsI18nEnhancer />
          {children}
        </CaseSessionProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
