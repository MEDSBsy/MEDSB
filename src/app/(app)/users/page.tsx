"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import { Icon } from "@/components/Icons";

type UserRow = { id: string; full_name: string; email: string | null; role: "admin" | "user"; is_active: boolean; created_at: string; forms: number; responses: number };

export default function UsersPage() {
  const { t } = useI18n();
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [me, setMe] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? "");
    const [{ data: p }, { data: f }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, role, is_active, created_at").order("created_at", { ascending: false }),
      supabase.from("forms").select("owner_id, response_count"),
    ]);
    const stats: Record<string, { forms: number; responses: number }> = {};
    (f ?? []).forEach((x) => { const s = (stats[x.owner_id] ??= { forms: 0, responses: 0 }); s.forms++; s.responses += x.response_count ?? 0; });
    setUsers(((p ?? []) as Omit<UserRow, "forms" | "responses">[]).map((x) => ({ ...x, forms: stats[x.id]?.forms ?? 0, responses: stats[x.id]?.responses ?? 0 })));
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function setRole(id: string, role: "admin" | "user") { await supabase.from("profiles").update({ role }).eq("id", id); load(); }
  async function toggleActive(u: UserRow) { await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id); load(); }
  async function remove(u: UserRow) {
    if (!confirm(t.confirmDeleteUser)) return;
    await supabase.rpc("admin_delete_user", { p_user: u.id });
    load();
  }

  const list = users.filter((u) => !q || (u.full_name + " " + (u.email ?? "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t.users} <span className="light">{users.length}</span></h1>
          <p className="text-[13px] font-light text-muted">{t.usersHint}</p>
        </div>
        <div className="relative">
          <input className="input !w-64 !ps-9" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
          <Icon name="search" size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        </div>
      </div>

      {loading ? <p className="text-muted font-light">{t.loading}</p> : (
        <div className="card !p-3">
          <table className="tbl">
            <thead>
              <tr><th>{t.fullName}</th><th className="hidden md:table-cell">{t.email}</th><th>{t.role}</th><th className="hidden sm:table-cell">{t.formsCount}</th><th className="hidden sm:table-cell">{t.responses}</th><th>{t.status}</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">{(u.full_name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>
                      <span className="font-medium">{u.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="hidden text-muted md:table-cell" dir="ltr">{u.email ?? "—"}</td>
                  <td>
                    <select className="input !w-auto !py-1.5 !text-[13px]" value={u.role} disabled={u.id === me} onChange={(e) => setRole(u.id, e.target.value as "admin" | "user")}>
                      <option value="user">{t.user}</option>
                      <option value="admin">{t.admin}</option>
                    </select>
                  </td>
                  <td className="hidden font-bold sm:table-cell">{u.forms}</td>
                  <td className="hidden font-bold sm:table-cell">{u.responses}</td>
                  <td><span className={u.is_active ? "status-approved" : "status-rejected"}>{u.is_active ? t.active : t.inactive}</span></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button className="btn-outline !py-1.5 text-[12px]" disabled={u.id === me} onClick={() => toggleActive(u)}>{u.is_active ? t.deactivate : t.activate}</button>
                      <button className="icon-btn !h-8 !w-8 hover:!text-danger" disabled={u.id === me} title={t.deleteUser} onClick={() => remove(u)}><Icon name="x" size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <div className="empty">{t.noData}</div>}
        </div>
      )}
    </div>
  );
}
