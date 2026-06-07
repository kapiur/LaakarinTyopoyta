import Link from "next/link";
import { KeyRound } from "lucide-react";
import { getCurrentSession } from "../../../lib/admin-auth";

type PageProps = {
  searchParams?: {
    error?: string;
  };
};

export default async function ProfileSecurityPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  const mustChangePassword = (session?.user as any)?.mustChangePassword === true;
  const serverError = typeof searchParams?.error === "string" ? searchParams.error : null;

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

        <form action="/profile/security/change" method="post" className="p-8 space-y-5">
          {mustChangePassword && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm font-semibold text-amber-700">
              Sinun tulee päivittää kirjautumistunniste ennen palvelun jatkokäyttöä.
            </div>
          )}

          {serverError && (
            <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-700">
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nykyinen tunniste</label>
            <input
              type="password"
              name="oldValue"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uusi tunniste</label>
            <input
              type="password"
              name="newValue"
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
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              minLength={8}
              required
            />
          </div>

          <p className="text-xs text-slate-500">
            Jos uusi tunniste ja vahvistus eivät täsmää, palvelu palauttaa sinut tälle sivulle virheilmoituksen kanssa.
          </p>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
          >
            Tallenna uusi tunniste
          </button>

          {!mustChangePassword && (
            <Link
              href="/"
              className="block w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 text-center"
            >
              Palaa etusivulle
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}
