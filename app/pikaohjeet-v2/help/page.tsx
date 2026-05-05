"use client";

import { ArrowLeft, BookOpen, CheckCircle2, NotebookTabs, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { useSession } from "next-auth/react";
import { useI18n } from "../../../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

const ui = {
  fi: {
    title: "Pikaohjeet v2 — käyttöohje",
    subtitle: "Lyhyt käytännön ohje uuden Pikaohjeet-osan käyttöön.",
    back: "Takaisin Pikaohjeisiin",
    userTitle: "Tavallinen käyttäjä",
    adminTitle: "Admin-käyttäjä",
    personalTitle: "Omat muistilaput",
    personalText: "Voit luoda omia yksityisiä muistilappuja. Ne näkyvät vain sinulle. Tekstin voi tallentaa sellaisenaan tai siistiä AI:lla ennen tallennusta.",
    manageTitle: "Muistilappujen hallinta",
    manageText: "Omat muistilaput -näkymässä voit muokata otsikkoa, kuvausta, tageja ja osioita. Voit myös lisätä tai poistaa osioita sekä parantaa sisältöä AI:lla.",
    clinicalTitle: "Kliiniset pikaohjeet",
    clinicalText: "Kliiniset kortit on tarkoitettu nopeaan käyttöön vastaanottotyössä. Ne eivät ole oppimateriaalia, vaan tiiviitä tarkistus- ja toimintakortteja.",
    builderTitle: "Clinical Builder",
    builderText: "Admin voi luoda uuden kliinisen kortin pitkästä materiaalista. Suuri materiaali käsitellään osissa, minkä jälkeen AI koostaa kompaktin pikaohjeen.",
    managerTitle: "Clinical Manager",
    managerText: "Admin voi korjata kliinisiä kortteja, lisätä ja järjestää osioita, muuttaa tarkistusstatusta ja arkistoida kortteja.",
    safetyTitle: "Tarkistus ja vastuu",
    safetyText: "AI-luonnokset pitää tarkistaa ennen kliinistä käyttöä. Erityisesti lääkeannokset, päivystyskriteerit, lähetteet ja Käypä hoito -viitteet tulee tarkistaa käsin.",
  },
  ru: {
    title: "Pikaohjeet v2 — инструкция",
    subtitle: "Краткая практическая инструкция по новому разделу Pikaohjeet.",
    back: "Назад в Pikaohjeet",
    userTitle: "Обычный пользователь",
    adminTitle: "Admin-пользователь",
    personalTitle: "Личные заметки",
    personalText: "Можно создавать личные приватные заметки. Они видны только вам. Текст можно сохранить как есть или сначала обработать через AI.",
    manageTitle: "Управление заметками",
    manageText: "В разделе «Мои заметки» можно редактировать заголовок, описание, теги и секции. Можно добавлять и удалять секции, а также улучшать текст через AI.",
    clinicalTitle: "Клинические pikaohje-карточки",
    clinicalText: "Клинические карточки предназначены для быстрого использования на приёме. Это не учебный материал, а компактные рабочие карточки для проверки и действия.",
    builderTitle: "Clinical Builder",
    builderText: "Admin может создать новую клиническую карточку из длинного материала. Большой материал обрабатывается по частям, затем AI собирает компактную pikaohje.",
    managerTitle: "Clinical Manager",
    managerText: "Admin может исправлять клинические карточки, добавлять и упорядочивать секции, менять статус проверки и архивировать карточки.",
    safetyTitle: "Проверка и ответственность",
    safetyText: "AI-черновики нужно проверять перед клиническим использованием. Особенно дозировки лекарств, критерии päivystys, направления и ссылки на Käypä hoito нужно проверять вручную.",
  },
  en: {
    title: "Pikaohjeet v2 — help",
    subtitle: "Short practical guide for the new Pikaohjeet section.",
    back: "Back to Pikaohjeet",
    userTitle: "Regular user",
    adminTitle: "Admin user",
    personalTitle: "Personal notes",
    personalText: "You can create private personal notes. They are visible only to you. Text can be saved as-is or cleaned with AI before saving.",
    manageTitle: "Note management",
    manageText: "In My notes you can edit title, description, tags, and sections. You can add or remove sections and improve content with AI.",
    clinicalTitle: "Clinical pikaohje cards",
    clinicalText: "Clinical cards are for quick use during clinical work. They are not learning materials, but compact action and checking cards.",
    builderTitle: "Clinical Builder",
    builderText: "Admins can create a new clinical card from long material. Large material is processed in chunks, then AI synthesizes a compact pikaohje.",
    managerTitle: "Clinical Manager",
    managerText: "Admins can edit clinical cards, add and reorder sections, change review status, and archive cards.",
    safetyTitle: "Review and responsibility",
    safetyText: "AI drafts must be reviewed before clinical use. Medication doses, emergency criteria, referrals, and Käypä hoito references should be checked manually.",
  },
};

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{icon}</div>
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
      </div>
      <p className="text-sm font-semibold leading-relaxed text-slate-500">{children}</p>
    </article>
  );
}

export default function PikaohjeetHelpPage() {
  const { language } = useI18n();
  const { data: session } = useSession();
  const dict = ui[(language as UiLang) || "fi"] ?? ui.fi;
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  return (
    <div className="mx-auto min-h-[calc(100vh-96px)] max-w-6xl p-6 text-slate-900">
      <header className="mb-6 rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm">
        <a href="/pikaohjeet-v2" className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400 hover:text-blue-600">
          <ArrowLeft size={14} /> {dict.back}
        </a>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">{dict.title}</h1>
        <p className="mt-2 text-sm font-bold text-slate-400">{dict.subtitle}</p>
      </header>

      <section className="mb-6 grid gap-5 md:grid-cols-2">
        <Card icon={<NotebookTabs size={20} />} title={dict.personalTitle}>{dict.personalText}</Card>
        <Card icon={<BookOpen size={20} />} title={dict.manageTitle}>{dict.manageText}</Card>
        <Card icon={<Stethoscope size={20} />} title={dict.clinicalTitle}>{dict.clinicalText}</Card>
        <Card icon={<ShieldCheck size={20} />} title={dict.safetyTitle}>{dict.safetyText}</Card>
      </section>

      {isAdmin && (
        <section className="grid gap-5 md:grid-cols-2">
          <Card icon={<Sparkles size={20} />} title={dict.builderTitle}>{dict.builderText}</Card>
          <Card icon={<CheckCircle2 size={20} />} title={dict.managerTitle}>{dict.managerText}</Card>
        </section>
      )}
    </div>
  );
}
