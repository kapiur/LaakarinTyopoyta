"use client";
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false
    });

    if (res?.error) setError('Väärä sähköposti tai salasana');
    else router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-3xl shadow-xl border w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-2xl mb-4 text-white">
            <LayoutDashboard size={32} />
          </div>
          <h1 className="text-2xl font-bold">Lääkärin Työpöytä 2.0</h1>
          <p className="text-slate-500 text-sm">Kirjaudu sisään jatkaaksesi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Sähköposti</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Salasana</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all">KIRJAUDU</button>
        </form>
      </div>
    </div>
  );
}
