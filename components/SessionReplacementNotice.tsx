"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "../lib/useI18n";

function buildDismissKey(sessionKey: string) {
  return `laakarin-tyopoyta:session-notice-dismissed:${sessionKey}`;
}

export default function SessionReplacementNotice() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const sessionKey = typeof (session?.user as any)?.authSessionKey === "string"
    ? (session?.user as any)?.authSessionKey
    : null;
  const shouldShowNotice = (session?.user as any)?.sessionReplacementNotice === true;
  const dismissKey = useMemo(() => (sessionKey ? buildDismissKey(sessionKey) : null), [sessionKey]);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !dismissKey || !shouldShowNotice) {
      setIsDismissed(true);
      return;
    }

    try {
      const dismissed = window.sessionStorage.getItem(dismissKey) === "true";
      setIsDismissed(dismissed);
    } catch {
      setIsDismissed(false);
    }
  }, [dismissKey, shouldShowNotice, status]);

  if (status !== "authenticated" || !dismissKey || !shouldShowNotice || isDismissed) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[100] max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 text-sm font-semibold text-amber-800">
          {t("auth.sessionReplacedNotice")}
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              window.sessionStorage.setItem(dismissKey, "true");
            } catch {}
            setIsDismissed(true);
          }}
          className="rounded-lg p-1 text-amber-700 transition hover:bg-amber-100"
          aria-label={t("common.close")}
          title={t("common.close")}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
