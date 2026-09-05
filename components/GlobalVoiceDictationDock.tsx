"use client";

import { useCallback, useEffect, useState } from "react";
import VoiceDictationButton, { appendDictationTranscript } from "./VoiceDictationButton";

type DictationTarget = HTMLTextAreaElement | HTMLInputElement;

function isTextTarget(element: EventTarget | null): element is DictationTarget {
  if (element instanceof HTMLTextAreaElement) return true;
  if (!(element instanceof HTMLInputElement)) return false;

  const blockedTypes = new Set(["button", "checkbox", "file", "hidden", "password", "radio", "range", "reset", "submit"]);
  return !blockedTypes.has(element.type);
}

function setReactCompatibleValue(element: DictationTarget, value: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function insertTranscript(element: DictationTarget, transcript: string) {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) return;

  const currentValue = element.value;
  const selectionStart = element.selectionStart;
  const selectionEnd = element.selectionEnd;

  if (typeof selectionStart === "number" && typeof selectionEnd === "number" && document.activeElement === element) {
    const before = currentValue.slice(0, selectionStart);
    const after = currentValue.slice(selectionEnd);
    const needsBeforeSpace = before.length > 0 && !/\s$/.test(before);
    const needsAfterSpace = after.length > 0 && !/^\s/.test(after);
    const nextValue = `${before}${needsBeforeSpace ? " " : ""}${cleanTranscript}${needsAfterSpace ? " " : ""}${after}`;
    const cursor = before.length + (needsBeforeSpace ? 1 : 0) + cleanTranscript.length;

    setReactCompatibleValue(element, nextValue);
    element.focus();
    element.setSelectionRange(cursor, cursor);
    return;
  }

  setReactCompatibleValue(element, appendDictationTranscript(currentValue, cleanTranscript));
  element.focus();
}

export default function GlobalVoiceDictationDock() {
  const [target, setTarget] = useState<DictationTarget | null>(null);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (isTextTarget(event.target)) {
        setTarget(event.target);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, []);

  const handleTranscript = useCallback(
    (text: string) => {
      const activeTarget = isTextTarget(document.activeElement) ? document.activeElement : target;
      if (!activeTarget || !document.body.contains(activeTarget)) return;
      insertTranscript(activeTarget, text);
      setTarget(activeTarget);
    },
    [target],
  );

  if (!target || !document.body.contains(target)) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] max-w-[calc(100vw-2rem)] rounded-2xl border border-blue-100 bg-white/95 p-2 shadow-xl shadow-slate-900/10 backdrop-blur">
      <VoiceDictationButton onTranscript={handleTranscript} />
    </div>
  );
}
