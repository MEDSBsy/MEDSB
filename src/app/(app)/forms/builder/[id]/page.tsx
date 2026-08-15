"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import type { FormField, FieldType, ProjectRow } from "@/lib/types";

const FIELD_TYPES: FieldType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "radio",
  "checkbox",
  "photo",
  "gps",
];

export default function FormBuilderPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const isNew = params.id === "new";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: projs } = await supabase.from("projects").select("*").eq("status", "active");
      setProjects((projs as ProjectRow[]) ?? []);
      if (!isNew) {
        const { data } = await supabase.from("forms").select("*").eq("id", params.id).single();
        if (data) {
          setTitle(data.title);
          setDescription(data.description ?? "");
          setProjectId(data.project_id);
          setFields(data.schema?.fields ?? []);
        }
      } else if (projs && projs.length > 0) {
        setProjectId(projs[0].id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addField() {
    setFields([
      ...fields,
      { key: `f_${Date.now()}`, label: "", type: "text", required: false },
    ]);
  }
  function updateField(i: number, patch: Partial<FormField>) {
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function moveField(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    setFields(next);
  }
  function removeField(i: number) {
    setFields(fields.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!title || !projectId) {
      setMsg(t.fillRequired);
      return;
    }
    setBusy(true);
    setMsg("");
    const payload = {
      title,
      description,
      project_id: projectId,
      schema: { fields },
      updated_at: new Date().toISOString(),
    };
    let error;
    if (isNew) {
      const { data: userData } = await supabase.auth.getUser();
      ({ error } = await supabase
        .from("forms")
        .insert({ ...payload, created_by: userData.user!.id }));
    } else {
      ({ error } = await supabase.from("forms").update(payload).eq("id", params.id));
    }
    setBusy(false);
    if (error) setMsg(error.message);
    else router.push("/forms");
  }

  const needsOptions = (type: FieldType) =>
    type === "select" || type === "radio" || type === "checkbox";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">
        {isNew ? t.newForm : t.edit}
      </h1>
      <div className="card space-y-4">
        <div>
          <label className="label">{t.title} *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">{t.description}</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">{t.project} *</label>
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">{t.selectProject}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {fields.map((f, i) => (
          <div key={f.key} className="card space-y-3">
            <div className="flex items-center justify-between">
              <span className="badge bg-brand-light text-brand-dark">#{i + 1}</span>
              <div className="flex gap-1">
                <button className="btn-outline !px-2 !py-1" onClick={() => moveField(i, -1)}>↑</button>
                <button className="btn-outline !px-2 !py-1" onClick={() => moveField(i, 1)}>↓</button>
                <button className="btn-danger !px-2 !py-1" onClick={() => removeField(i)}>✕</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t.fieldLabel}</label>
                <input className="input" value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} />
              </div>
              <div>
                <label className="label">{t.fieldType}</label>
                <select
                  className="input"
                  value={f.type}
                  onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft} value={ft}>
                      {t[ft]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {needsOptions(f.type) && (
              <div>
                <label className="label">{t.options}</label>
                <input
                  className="input"
                  value={(f.options ?? []).join(",")}
                  onChange={(e) =>
                    updateField(i, {
                      options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) => updateField(i, { required: e.target.checked })}
              />
              {t.required}
            </label>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-outline" onClick={addField}>
          + {t.addField}
        </button>
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? t.loading : t.save}
        </button>
        {msg && <p className="text-sm text-umber-500">{msg}</p>}
      </div>
    </div>
  );
}
