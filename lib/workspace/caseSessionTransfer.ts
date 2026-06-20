"use client";

export type CaseSessionTransferTarget = "text_tool" | "assistant";

export type CaseSessionTransferPayload = {
  target: CaseSessionTransferTarget;
  content: string;
};

export const CASE_SESSION_TRANSFER_EVENT = "laakarin-tyopoyta:case-session-transfer";
const CASE_SESSION_TRANSFER_STORAGE_KEY = "laakarin-tyopoyta:case-session-transfer";

export function queueCaseSessionTransfer(payload: CaseSessionTransferPayload) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CASE_SESSION_TRANSFER_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(CASE_SESSION_TRANSFER_EVENT, { detail: payload }));
}

export function consumeQueuedCaseSessionTransfer(): CaseSessionTransferPayload | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(CASE_SESSION_TRANSFER_STORAGE_KEY);
  if (!raw) return null;

  window.sessionStorage.removeItem(CASE_SESSION_TRANSFER_STORAGE_KEY);

  try {
    const parsed = JSON.parse(raw) as Partial<CaseSessionTransferPayload>;
    if (
      (parsed.target === "text_tool" || parsed.target === "assistant") &&
      typeof parsed.content === "string" &&
      parsed.content.trim()
    ) {
      return {
        target: parsed.target,
        content: parsed.content.trim(),
      };
    }
  } catch (error) {
    console.error("Case session transfer parsing failed", error);
  }

  return null;
}
