"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PcaLibraryEditLinksEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/calculators/peds-library') return;

    const addLinks = () => {
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

        const allCards = Array.from(section.querySelectorAll('div.rounded-2xl.border.border-slate-100'));
        const cardIndex = allCards.indexOf(card);
        const pageDataScript = document.getElementById('__NEXT_DATA__');

        const link = document.createElement('a');
        link.dataset.pcaEditLink = 'true';
        link.textContent = 'Muokkaa';
        link.className = 'px-3 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 transition-all';

        const drugIdFromDelete = deleteButton.getAttribute('onclick')?.match(/deletePcaDrug\((\d+)\)/)?.[1];
        if (drugIdFromDelete) {
          link.href = `/calculators/peds-library/pca/${drugIdFromDelete}`;
        } else {
          link.href = '#';
          link.title = 'Päivitä sivu, jos muokkauslinkki ei avaudu';
        }

        const parent = deleteButton.parentElement;
        if (parent) {
          parent.classList.add('flex', 'items-center', 'gap-1');
          parent.insertBefore(link, deleteButton);
        }
      });
    };

    const interval = window.setInterval(addLinks, 500);
    addLinks();

    return () => window.clearInterval(interval);
  }, [pathname]);

  return null;
}
