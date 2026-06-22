"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function CalculatorsTabEnhancer() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== '/calculators') return;

    const nav = document.querySelector('div.flex.bg-white.p-1.rounded-2xl.border.shadow-sm.overflow-x-auto');
    if (!nav) return;

    const buttons = Array.from(nav.querySelectorAll('button'));
    const isDoseCalculatorButton = (label: string | null | undefined) => {
      const normalized = (label || '').toLowerCase();
      return normalized.includes('peds')
        || normalized.includes('dose/kg')
        || normalized.includes('annos')
        || normalized.includes('доз');
    };
    const pedsButton = buttons.find((button) => isDoseCalculatorButton(button.textContent));
    const pcaButton = buttons.find((button) => button.textContent?.toLowerCase().includes('pca'));
    const vteButton = buttons.find((button) => button.textContent?.toLowerCase().includes('vte'));

    if (pedsButton instanceof HTMLButtonElement) {
      pedsButton.style.order = '-20';
      pedsButton.title = 'Avaa painoperusteinen annoslaskuri';
    }

    if (pcaButton instanceof HTMLButtonElement) {
      pcaButton.style.order = '-10';
      pcaButton.title = 'Avaa uusi PCA-laskuri';
    }

    const handlePedsClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof (event as any).stopImmediatePropagation === 'function') {
        (event as any).stopImmediatePropagation();
      }
      router.push('/calculators/peds');
    };

    const handlePcaClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof (event as any).stopImmediatePropagation === 'function') {
        (event as any).stopImmediatePropagation();
      }
      router.push('/calculators/pca');
    };

    pedsButton?.addEventListener('click', handlePedsClick, true);
    pcaButton?.addEventListener('click', handlePcaClick, true);

    const oldPcaIsActive = pcaButton instanceof HTMLButtonElement && pcaButton.className.includes('bg-blue-600');
    const fallbackButton = vteButton instanceof HTMLButtonElement ? vteButton : undefined;

    if (oldPcaIsActive && fallbackButton) {
      window.setTimeout(() => {
        fallbackButton.click();
      }, 0);
    }

    return () => {
      pedsButton?.removeEventListener('click', handlePedsClick, true);
      pcaButton?.removeEventListener('click', handlePcaClick, true);
      if (pedsButton instanceof HTMLButtonElement) {
        pedsButton.style.order = '';
        pedsButton.title = '';
      }
      if (pcaButton instanceof HTMLButtonElement) {
        pcaButton.style.order = '';
        pcaButton.title = '';
      }
    };
  }, [pathname, router]);

  return null;
}
