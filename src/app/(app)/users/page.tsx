"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import type { ProjectRow } from "@/lib/types";

type UserRow = {
  id: string;
  full_name: string;
  role: "admin" | "supervisor" | "collector";
  is_active: boolean;
};
type Membership = { project_id: string; user_id: string };

export default function UsersPage() {
  const { t } = useI18n();
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: u }, { data: p }, { data: m }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, role, is_active").order("created_at"),
      supabase.from("projects").select("*"),
      supabase.from("project_members").select("project_id, user_id"),
    ]);
    setUsers((u as UserRow[]) ?? []);
    setProjects((p as ProjectRow[]) ?? []);
    setMembers((m as Membership[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setRole(id: string, role: string) {
    await supabase.from("profiles").update({ role }).eq("id", id);
    load();
  }
  async function toggleActive(u: UserRow) {
    await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id);
    load();
  }
  async function toggleMembership(userId: string, projectId: string, isMember: boolean) {
    if (isMember) {
      await supabase
        .from("project_members")
        .delete()
        .eq("user_id", userId)
        .eq("project_id", projectId);
    } else {
      await supabase.from("project_members").insert({ user_id: userId, project_id: projectId });
    }
    load();
  }

  if (loading) return <p className="text-gray-500">{t.loading}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-dark">{t.users}</h1>
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold">{u.full_name || "—"}</span>
                <span className={`badge ${u.is_active ? "status-approved" : "bg-red-100 text-umber-500"}`}>
                  {u.is_active ? t.active : t.inactive}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="input !w-auto"
                  value={u.role}
                  onChange={(e) => setRole(u.id, e.target.value)}
                >
                  <option value="admin">{t.admin}</option>
                  <option value="supervisor">{t.supervisor}</option>
                  <option value="collector">{t.collector}</option>
                </select>
                <button className={u.is_active ? "btn-danger" : "btn-outline"} onClick={() => toggleActive(u)}>
                  {u.is_active ? t.deactivate : t.activate}
                </button>
              </div>
            </div>
            {projects.length > 0 && (
              <div>
                <p className="label">{t.members} — {t.projects}:</p>
                <div className="flex flex-wrap gap-2">
                  {projects.map((p) => {
                    const isMember = members.some(
                      (m) => m.user_id === u.id && m.project_id === p.id
                    );
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleMembership(u.id, p.id, isMember)}
                        className={`badge border transition ${
                          isMember
                            ? "border-brand bg-brand text-white"
                            : "border-gray-300 bg-white text-gray-600 hover:border-brand"
                        }`}
                      >
                        {p.name} {isMember ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
