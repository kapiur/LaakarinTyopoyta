"use client";

import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

const ui = {
  fi: {
    title: "Ei käyttöoikeutta",
    text: "Tämä toiminto on tarkoitettu vain ADMIN-käyttäjälle. Voit silti käyttää Pikaohjeita ja omia muistilappuja normaalisti.",
    back: "Takaisin Pikaohjeisiin",
    notes: "Omat muistilaput",
  },
  ru: {
    title: "Нет доступа",
    text: "Эта функция доступна только пользователю с ролью ADMIN. Вы по-прежнему можете пользоваться Pikaohjeet и личными заметками.",
    back: "Назад в Pikaohjeet",
    notes: "Мои заметки",
  },
  en: {
    title: "No access",
    text: "This function is available only for ADMIN users. You can still use Pikaohjeet and your personal notes normally.",
    back: "Back to Pikaohjeet",
    notes: "My notes",
  },
};

export default function PikaohjeetNoAccessPage() {
  const { language } = useI18n();
  const dict = ui[(language as UiLang) || "fi"] ?? ui.fi;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] max-w-3xl items-center justify-center p-6 text-slate-900">
      <section className="w-full rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert size={28} />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">{dict.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-relaxed text-slate-500">{dict.text}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a href="/pikaohjeet-v2" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-blue-100 hover:bg-blue-700">
            <ArrowLeft size={15} /> {dict.back}
          </a>
          <a href="/pikaohjeet-v2/muistilaput" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50">
            {dict.notes}
          </a>
        </div>
      </section>
    </div>
  );
}
