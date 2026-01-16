"use client";
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      console.log("Yritetään kirjautua...", email);
      const res = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password: password,
        redirect: false
      });

      console.log("Vastaus:", res);

      if (res?.error) {
        setError('Väärä sähköposti tai salasana');
      } else if (res?.ok) {
        router.push('/');
        router.refresh(); // Обновляем состояние сервера
      }
    } catch (err) {
      console.error("Kirjautumisvirhe:", err);
      setError('Palvelinvirhe. Yritä uudelleen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-3xl shadow-xl border w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-2xl mb-4 text-white">
            <LayoutDashboard size={32} />
          </div>
          <h1 className="text-2xl font-bold">Lääkärin Työpöytä</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="email" 
            placeholder="Sähköposti"
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" 
            required 
          />
          <input 
            type="password" 
            placeholder="Salasana"
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" 
            required 
          />
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:bg-slate-300 flex justify-center items-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            {loading ? 'KIRJAUTUDUTAAN...' : 'KIRJAUDU'}
          </button>
        </form>
      </div>
    </div>
  );
}
