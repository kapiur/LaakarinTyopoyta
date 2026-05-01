"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { KeyRound, Settings, Shield, UserCog, Users } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
          <Settings size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Asetukset</h1>
          <p className="text-sm text-slate-500">Käyttäjätilin ja ylläpidon asetukset.</p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link
          href="/profile/security"
          className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <KeyRound size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Turva-asetukset</h2>
              <p className="text-sm text-slate-500">Vaihda oma salasana ja tarkista kirjautumistilin perustiedot.</p>
              <p className="text-xs font-semibold text-slate-400 pt-2">{session?.user?.email}</p>
            </div>
          </div>
        </Link>

        {isAdmin && (
          <Link
            href="/admin/users"
            className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users size={24} />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">Käyttäjähallinta</h2>
                <p className="text-sm text-slate-500">Luo käyttäjiä, poista käyttäjätilejä ja hallitse käyttöoikeuksia.</p>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider pt-2">Admin</p>
              </div>
            </div>
          </Link>
        )}
      </section>

      {isAdmin && (
        <section className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Ylläpitäjän huomio</h2>
            <p className="text-sm text-slate-500 mt-1">
              Prompt Lab on poistettu sivuvalikosta. AI-työkalujen hallinta tapahtuu jatkossa uuden AI-työkalut-rakenteen kautta.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
