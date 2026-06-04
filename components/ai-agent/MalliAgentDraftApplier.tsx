"use client";

import { useEffect } from "react";

type ApplyDraftDetail = {
  templateTitle?: string;
  categoryName?: string;
  draft?: string;
};

function findSelectedTemplateEditButton() {
  const buttons = Array.from(document.querySelectorAll("button"));
  return buttons.find((button) => {
    const title = button.getAttribute("title") || "";
    return ["Muokkaa mallia", "Редактировать шаблон", "Edit template"].includes(title);
  }) as HTMLButtonElement | undefined;
}

function findTemplateContentTextarea() {
  const textareas = Array.from(document.querySelectorAll("textarea")) as HTMLTextAreaElement[];
  return textareas.find((textarea) => {
    const className = textarea.getAttribute("class") || "";
    return className.includes("font-mono") || textarea.value.includes("{{");
  });
}

function setReactTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  nativeSetter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  textarea.focus();
}

async function waitForTextarea(timeoutMs = 2500) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const textarea = findTemplateContentTextarea();
    if (textarea) return textarea;
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
  return null;
}

export default function MalliAgentDraftApplier() {
  useEffect(() => {
    async function handleApplyDraft(event: Event) {
      const detail = (event as CustomEvent<ApplyDraftDetail>).detail;
      const draft = detail?.draft?.trim();
      if (!draft) return;

      const editButton = findSelectedTemplateEditButton();
      editButton?.click();

      const textarea = await waitForTextarea();
      if (!textarea) {
        console.warn("Malli agent draft apply failed: template content textarea not found");
        return;
      }

      setReactTextareaValue(textarea, draft);
    }

    window.addEventListener("malli-agent-apply-draft", handleApplyDraft);
    return () => window.removeEventListener("malli-agent-apply-draft", handleApplyDraft);
  }, []);

  return null;
}
