"use client";

import { useEffect } from 'react';
import TemplatesRedesignPage from '../templates/redesign/page';

function MalliAiOverlaySizeEnhancer() {
  useEffect(() => {
    const titleFragments = [
      'AI-помощник шаблона',
      'AI-avustaja',
      'AI assistant',
      'AI-assistant',
      'AI polish',
      'AI-hionta',
    ];

    const applySize = () => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>('body *'));
      const titleElement = elements.find((element) => {
        const text = element.textContent?.trim() || '';
        return titleFragments.some((fragment) => text.includes(fragment));
      });

      if (!titleElement) return;

      let panel: HTMLElement | null = titleElement;
      while (panel && panel !== document.body) {
        const style = window.getComputedStyle(panel);
        if (style.position === 'fixed' || panel.className.toString().includes('fixed')) break;
        panel = panel.parentElement;
      }

      if (!panel || panel === document.body) return;

      panel.style.setProperty('width', 'min(92rem, calc(100vw - 3rem))', 'important');
      panel.style.setProperty('max-width', 'min(92rem, calc(100vw - 3rem))', 'important');
      panel.style.setProperty('min-width', 'min(92rem, calc(100vw - 3rem))', 'important');
      panel.style.setProperty('height', 'min(88vh, calc(100vh - 3rem))', 'important');
      panel.style.setProperty('max-height', 'min(88vh, calc(100vh - 3rem))', 'important');
      panel.style.setProperty('top', '50%', 'important');
      panel.style.setProperty('left', '50%', 'important');
      panel.style.setProperty('right', 'auto', 'important');
      panel.style.setProperty('bottom', 'auto', 'important');
      panel.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
      panel.style.setProperty('display', 'flex', 'important');
      panel.style.setProperty('flex-direction', 'column', 'important');
      panel.style.setProperty('overflow', 'hidden', 'important');

      const innerPanels = Array.from(panel.querySelectorAll<HTMLElement>('div'));
      innerPanels.slice(0, 6).forEach((element) => {
        element.style.setProperty('max-width', '100%', 'important');
      });

      panel.querySelectorAll<HTMLElement>('textarea').forEach((textarea) => {
        textarea.style.setProperty('min-height', '30vh', 'important');
      });

      panel.querySelectorAll<HTMLElement>('[class*="overflow-y-auto"], [class*="overflow-auto"]').forEach((element) => {
        element.style.setProperty('max-height', 'calc(88vh - 8rem)', 'important');
      });
    };

    applySize();
    const interval = window.setInterval(applySize, 300);
    window.addEventListener('resize', applySize);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', applySize);
    };
  }, []);

  return null;
}

export default function MalliPage() {
  return (
    <div className="malli-page-scope">
      <MalliAiOverlaySizeEnhancer />
      <TemplatesRedesignPage />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .malli-page-scope [class*="z-50"][class*="justify-end"] > div[class*="max-w-3xl"] {
              max-width: min(96rem, calc(100vw - 1rem)) !important;
            }

            .malli-page-scope [class*="z-50"][class*="justify-end"] textarea {
              min-height: 60vh !important;
            }

            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-sm"],
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-md"],
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-lg"],
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-xl"] {
              width: min(72rem, calc(100vw - 2rem)) !important;
              max-width: min(72rem, calc(100vw - 2rem)) !important;
            }

            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-sm"] textarea,
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-md"] textarea,
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-lg"] textarea,
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-xl"] textarea {
              min-height: 45vh !important;
            }
          `,
        }}
      />
    </div>
  );
}
