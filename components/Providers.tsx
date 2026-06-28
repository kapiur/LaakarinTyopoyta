"use client";
import { SessionProvider } from "next-auth/react";
import PasswordChangeGuard from "./PasswordChangeGuard";
import { I18nProvider } from "./I18nProvider";
import MalliSyntaxHelpEnhancer from "./MalliSyntaxHelpEnhancer";
import CoreUiI18nEnhancer from "./CoreUiI18nEnhancer";
import CalculatorsI18nEnhancer from "./CalculatorsI18nEnhancer";
import StandaloneCalculatorsI18nEnhancer from "./StandaloneCalculatorsI18nEnhancer";
import { CaseSessionProvider } from "./workspace/CaseSessionProvider";
import SessionValidityGuard from "./SessionValidityGuard";
import SessionReplacementNotice from "./SessionReplacementNotice";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={30} refetchOnWindowFocus>
      <I18nProvider>
        <CaseSessionProvider>
          <SessionValidityGuard />
          <SessionReplacementNotice />
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
