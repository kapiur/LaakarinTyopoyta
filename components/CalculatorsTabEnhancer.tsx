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
    const pedsButton = buttons.find((button) => button.textContent?.toLowerCase().includes('peds'));
    const pcaButton = buttons.find((button) => button.textContent?.toLowerCase().includes('pca'));

    if (pedsButton instanceof HTMLButtonElement) {
      pedsButton.style.order = '-20';
      pedsButton.title = 'Avaa uusi PEDS-laskuri';
    }

    if (pcaButton instanceof HTMLButtonElement) {
      pcaButton.style.order = '-10';
    }

    const handlePedsClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof (event as any).stopImmediatePropagation === 'function') {
        (event as any).stopImmediatePropagation();
      }
      router.push('/calculators/peds');
    };

    pedsButton?.addEventListener('click', handlePedsClick, true);

    return () => {
      pedsButton?.removeEventListener('click', handlePedsClick, true);
      if (pedsButton instanceof HTMLButtonElement) {
        pedsButton.style.order = '';
        pedsButton.title = '';
      }
      if (pcaButton instanceof HTMLButtonElement) {
        pcaButton.style.order = '';
      }
    };
  }, [pathname, router]);

  return null;
}
