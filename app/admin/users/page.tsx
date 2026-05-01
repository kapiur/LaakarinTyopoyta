"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, RefreshCcw, Save, Shield, UserCog, UserPlus, XCircle } from "lucide-react";

type AdminUser = {
  id: number;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", isActive: true, mustChangePassword: false });
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", mustChangePassword: true });

  const adminCount = useMemo(() => users.filter((user) => user.role === "ADMIN").length, [users]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Käyttäjien haku epäonnistui");
      }

      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Käyttäjien haku epäonnistui");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function startEdit(user: AdminUser) {
    setEditingId(user.id);
    setEditForm({
      name: user.name || "",
      email: user.email,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword
    });
    setMessage(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: "", email: "", isActive: true, mustChangePassword: false });
  }

  async function createUser() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Käyttäjän luominen epäonnistui");
      }

      setNewUser({ name: "", email: "", password: "", mustChangePassword: true });
      setMessage("Käyttäjä luotu onnistuneesti.");
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Käyttäjän luominen epäonnistui");
    } finally {
      setSaving(false);
    }
  }

  async function saveUser(userId: number) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Käyttäjän päivitys epäonnistui");
      }

      setMessage("Käyttäjän tiedot päivitetty.");
      cancelEdit();
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Käyttäjän päivitys epäonnistui");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <UserCog size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Käyttäjähallinta</h1>
            <p className="text-sm text-slate-500">Suljettu käyttäjämalli: vain admin voi luoda uusia käyttäjiä.</p>
          </div>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          Päivitä
        </button>
      </header>

      {(message || error) && (
        <div className={`rounded-2xl px-5 py-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
          {error || message}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserPlus size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Luo uusi käyttäjä</h2>
            <p className="text-xs text-slate-500">Uusi käyttäjä saa aina roolin USER. Admin-roolia ei jaeta käyttöliittymästä.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={newUser.name}
            onChange={(event) => setNewUser({ ...newUser, name: event.target.value })}
            placeholder="Nimi"
            className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            value={newUser.email}
            onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
            placeholder="Sähköposti"
            type="email"
            className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            value={newUser.password}
            onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
            placeholder="Väliaikainen salasana"
            type="password"
            className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            onClick={createUser}
            disabled={saving || !newUser.email || newUser.password.length < 8}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Luo käyttäjä
          </button>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={newUser.mustChangePassword}
            onChange={(event) => setNewUser({ ...newUser, mustChangePassword: event.target.checked })}
            className="rounded border-slate-300"
          />
          Vaadi salasanan vaihto ensimmäisen kirjautumisen jälkeen
        </label>
      </section>

      <section className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Käyttäjät</h2>
            <p className="text-xs text-slate-500">Admin-käyttäjiä: {adminCount}. Käyttäjiä yhteensä: {users.length}.</p>
          </div>
          <Shield size={22} className="text-slate-300" />
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 size={18} className="animate-spin" /> Ladataan käyttäjiä...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="text-left p-4">Käyttäjä</th>
                  <th className="text-left p-4">Rooli</th>
                  <th className="text-left p-4">Tila</th>
                  <th className="text-left p-4">Viimeisin kirjautuminen</th>
                  <th className="text-right p-4">Toiminnot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isEditing = editingId === user.id;

                  return (
                    <tr key={user.id} className="align-top">
                      <td className="p-4 min-w-[260px]">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              value={editForm.name}
                              onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                              placeholder="Nimi"
                              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                            />
                            <input
                              value={editForm.email}
                              onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                              placeholder="Sähköposti"
                              type="email"
                              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-slate-800">{user.name || "Nimetön käyttäjä"}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                            <p className="text-[10px] text-slate-400 mt-1">Luotu: {formatDate(user.createdAt)}</p>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${user.role === "ADMIN" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 min-w-[220px]">
                        {isEditing ? (
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={editForm.isActive}
                                onChange={(event) => setEditForm({ ...editForm, isActive: event.target.checked })}
                              />
                              Käyttäjä aktiivinen
                            </label>
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={editForm.mustChangePassword}
                                onChange={(event) => setEditForm({ ...editForm, mustChangePassword: event.target.checked })}
                              />
                              Vaadi salasanan vaihto
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${user.isActive ? "text-emerald-600" : "text-red-600"}`}>
                              {user.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                              {user.isActive ? "Aktiivinen" : "Ei käytössä"}
                            </div>
                            {user.mustChangePassword && (
                              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Salasanan vaihto vaaditaan</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-500 whitespace-nowrap">{formatDate(user.lastLoginAt)}</td>
                      <td className="p-4 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveUser(user.id)}
                              disabled={saving}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-50"
                            >
                              <Save size={14} /> Tallenna
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-500"
                            >
                              Peruuta
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(user)}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                          >
                            Muokkaa
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
