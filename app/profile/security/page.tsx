"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { KeyRound, Loader2 } from "lucide-react";

export default function ProfileSecurityPage() {
  const { data: session } = useSession();
  const [oldValue, setOldValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [repeatValue, setRepeatValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setServerError(params.get("error"));
  }, []);

  function handleSubmit(event: React.FormEvent) {
    setError(null);

    if (newValue !== repeatValue) {
      event.preventDefault();
      setError("Uusi tunniste ja vahvistus eivät täsmää.");
      return;
    }

    setSubmitting(true);
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <KeyRound size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Turva-asetukset</h1>
            <p className="text-sm text-slate-500">{session?.user?.email}</p>
          </div>
        </div>

        <form action="/profile/security/change" method="post" onSubmit={handleSubmit} className="p-8 space-y-5">
          {(session?.user as any)?.mustChangePassword && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm font-semibold text-amber-700">
              Sinun tulee päivittää kirjautumistunniste ennen palvelun jatkokäyttöä.
            </div>
          )}

          {(error || serverError) && (
            <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-700">
              {error || serverError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nykyinen tunniste</label>
            <input
              type="password"
              name="oldValue"
              value={oldValue}
              onChange={(event) => setOldValue(event.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uusi tunniste</label>
            <input
              type="password"
              name="newValue"
              value={newValue}
              onChange={(event) => setNewValue(event.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vahvista uusi tunniste</label>
            <input
              type="password"
              name="repeatValue"
              value={repeatValue}
              onChange={(event) => setRepeatValue(event.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !oldValue || !newValue || !repeatValue}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Tallenna uusi tunniste
          </button>

          {!(session?.user as any)?.mustChangePassword && (
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Palaa etusivulle
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
