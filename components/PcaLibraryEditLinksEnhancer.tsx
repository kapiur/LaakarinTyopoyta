"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type PcaDrug = {
  id: number;
  name: string;
  strength: number;
};

export default function PcaLibraryEditLinksEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/calculators/peds-library') return;

    let cancelled = false;
    let drugs: PcaDrug[] = [];

    const loadDrugs = async () => {
      try {
        const response = await fetch('/api/pca-library');
        if (!response.ok) return;
        const data = await response.json();
        drugs = Array.isArray(data) ? data : [];
      } catch {
        drugs = [];
      }
    };

    const addLinks = () => {
      if (cancelled || drugs.length === 0) return;

      const sectionTitle = Array.from(document.querySelectorAll('h2')).find((item) => item.textContent?.includes('PCA-lääkekirjasto'));
      const section = sectionTitle?.closest('section');
      if (!section) return;

      const cards = Array.from(section.querySelectorAll('div.rounded-2xl.border.border-slate-100'));

      cards.forEach((card) => {
        if (!(card instanceof HTMLElement)) return;
        if (card.querySelector('[data-pca-edit-link="true"]')) return;

        const deleteButton = card.querySelector('button[title="Poista PCA-lääke"]');
        if (!(deleteButton instanceof HTMLElement)) return;

        const nameElement = card.querySelector('.text-sm.font-black.text-slate-800');
        const name = nameElement?.textContent?.trim();
        if (!name) return;

        const drug = drugs.find((item) => item.name === name);
        if (!drug) return;

        const link = document.createElement('a');
        link.dataset.pcaEditLink = 'true';
        link.textContent = 'Muokkaa';
        link.href = `/calculators/peds-library/pca/${drug.id}`;
        link.className = 'px-3 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 transition-all';

        const parent = deleteButton.parentElement;
        if (parent) {
          parent.classList.add('flex', 'items-center', 'gap-1');
          parent.insertBefore(link, deleteButton);
        }
      });
    };

    loadDrugs().then(addLinks);
    const interval = window.setInterval(addLinks, 500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname]);

  return null;
}
