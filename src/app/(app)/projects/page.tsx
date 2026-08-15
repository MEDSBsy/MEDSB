"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import type { ProjectRow } from "@/lib/types";

export default function ProjectsPage() {
  const { t } = useI18n();
  const supabase = createClient();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await supabase.from("projects").select("*").order("created_at");
    setProjects((data as ProjectRow[]) ?? []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    if (!name) return;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("projects")
      .insert({ name, description, created_by: userData.user!.id });
    if (error) setMsg(error.message);
    else {
      setName("");
      setDescription("");
      setMsg("");
      load();
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">{t.projects}</h1>
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label">{t.title}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="label">{t.description}</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={create}>
          + {t.newProject}
        </button>
      </div>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <div key={p.id} className="card">
            <h2 className="font-bold">{p.name}</h2>
            {p.description && <p className="text-sm text-gray-600">{p.description}</p>}
          </div>
        ))}
        {projects.length === 0 && <p className="text-gray-500">{t.noData}</p>}
      </div>
    </div>
  );
}
