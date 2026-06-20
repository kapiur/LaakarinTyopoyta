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

type AddCaseSessionItemInput = {
  type: CaseSessionItemType;
  title: string;
  content: string;
  sourceLabel?: string;
  sourceUrl?: string;
};

type CaseSessionContextValue = {
  items: CaseSessionItem[];
  isReady: boolean;
  addItem: (input: AddCaseSessionItemInput) => void;
  removeItem: (id: string) => void;
  clearSession: () => void;
};

const STORAGE_KEY = "laakarin-tyopoyta:case-session";
const MAX_ITEMS = 24;
const MAX_CONTENT_LENGTH = 12000;

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

export function CaseSessionProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CaseSessionItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(normalizeStoredItems(JSON.parse(raw)));
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
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Case session saving failed", error);
    }
  }, [isReady, items]);

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

  const clearSession = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CaseSessionContextValue>(() => ({
    items,
    isReady,
    addItem,
    removeItem,
    clearSession,
  }), [addItem, clearSession, isReady, items, removeItem]);

  return <CaseSessionContext.Provider value={value}>{children}</CaseSessionContext.Provider>;
}

export function useCaseSession() {
  const context = useContext(CaseSessionContext);
  if (!context) {
    throw new Error("useCaseSession must be used within CaseSessionProvider");
  }
  return context;
}
