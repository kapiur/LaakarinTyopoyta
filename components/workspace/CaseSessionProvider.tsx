"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CaseSessionItemType =
  | "clinical_note"
  | "calculation"
  | "article"
  | "guideline_check"
  | "discussion"
  | "result";

export type CaseSessionItem = {
  id: string;
  type: CaseSessionItemType;
  title: string;
  content: string;
  sourceLabel?: string;
  sourceUrl?: string;
  createdAt: string;
};

export type CaseSessionDraft = {
  summary: string;
  plan: string;
  questions: string;
};

type AddCaseSessionItemInput = {
  type: CaseSessionItemType;
  title: string;
  content: string;
  sourceLabel?: string;
  sourceUrl?: string;
};

type CaseSessionDraftField = keyof CaseSessionDraft;

type CaseSessionContextValue = {
  items: CaseSessionItem[];
  draft: CaseSessionDraft;
  isReady: boolean;
  addItem: (input: AddCaseSessionItemInput) => void;
  removeItem: (id: string) => void;
  updateDraft: (field: CaseSessionDraftField, value: string) => void;
  resetDraft: () => void;
  clearSession: () => void;
};

const STORAGE_KEY = "laakarin-tyopoyta:case-session";
const MAX_ITEMS = 24;
const MAX_CONTENT_LENGTH = 12000;
const MAX_DRAFT_LENGTH = 4000;
const EMPTY_DRAFT: CaseSessionDraft = {
  summary: "",
  plan: "",
  questions: "",
};

const CaseSessionContext = createContext<CaseSessionContextValue | null>(null);

function normalizeStoredItems(value: unknown): CaseSessionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is CaseSessionItem => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      type: typeof item.type === "string" ? (item.type as CaseSessionItemType) : "result",
      title: typeof item.title === "string" ? item.title.slice(0, 180) : "Untitled item",
      content: typeof item.content === "string" ? item.content.slice(0, MAX_CONTENT_LENGTH) : "",
      sourceLabel: typeof item.sourceLabel === "string" ? item.sourceLabel.slice(0, 255) : undefined,
      sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl.slice(0, 2000) : undefined,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    }))
    .filter((item) => item.content.trim().length > 0)
    .slice(0, MAX_ITEMS);
}

function normalizeStoredDraft(value: unknown): CaseSessionDraft {
  if (!value || typeof value !== "object") return EMPTY_DRAFT;

  const draft = value as Partial<Record<CaseSessionDraftField, unknown>>;
  return {
    summary: typeof draft.summary === "string" ? draft.summary.slice(0, MAX_DRAFT_LENGTH) : "",
    plan: typeof draft.plan === "string" ? draft.plan.slice(0, MAX_DRAFT_LENGTH) : "",
    questions: typeof draft.questions === "string" ? draft.questions.slice(0, MAX_DRAFT_LENGTH) : "",
  };
}

export function CaseSessionProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CaseSessionItem[]>([]);
  const [draft, setDraft] = useState<CaseSessionDraft>(EMPTY_DRAFT);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;

        if (Array.isArray(parsed)) {
          setItems(normalizeStoredItems(parsed));
          setDraft(EMPTY_DRAFT);
        } else {
          const storedState = parsed as { items?: unknown; draft?: unknown };
          setItems(normalizeStoredItems(storedState.items));
          setDraft(normalizeStoredDraft(storedState.draft));
        }
      }
    } catch (error) {
      console.error("Case session loading failed", error);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          items,
          draft,
        }),
      );
    } catch (error) {
      console.error("Case session saving failed", error);
    }
  }, [draft, isReady, items]);

  const addItem = useCallback((input: AddCaseSessionItemInput) => {
    const title = input.title.trim().slice(0, 180);
    const content = input.content.trim().slice(0, MAX_CONTENT_LENGTH);
    if (!title || !content) return;

    setItems((current) => [
      {
        id: crypto.randomUUID(),
        type: input.type,
        title,
        content,
        sourceLabel: input.sourceLabel?.trim().slice(0, 255) || undefined,
        sourceUrl: input.sourceUrl?.trim().slice(0, 2000) || undefined,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ].slice(0, MAX_ITEMS));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const updateDraft = useCallback((field: CaseSessionDraftField, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value.slice(0, MAX_DRAFT_LENGTH),
    }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(EMPTY_DRAFT);
  }, []);

  const clearSession = useCallback(() => {
    setItems([]);
    setDraft(EMPTY_DRAFT);
  }, []);

  const value = useMemo<CaseSessionContextValue>(() => ({
    items,
    draft,
    isReady,
    addItem,
    removeItem,
    updateDraft,
    resetDraft,
    clearSession,
  }), [addItem, clearSession, draft, isReady, items, removeItem, resetDraft, updateDraft]);

  return <CaseSessionContext.Provider value={value}>{children}</CaseSessionContext.Provider>;
}

export function useCaseSession() {
  const context = useContext(CaseSessionContext);
  if (!context) {
    throw new Error("useCaseSession must be used within CaseSessionProvider");
  }
  return context;
}
