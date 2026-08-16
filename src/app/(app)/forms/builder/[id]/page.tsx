"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import { Icon } from "@/components/Icons";
import FieldRenderer from "@/components/FieldRenderer";
import { FIELD_META, GROUP_LABELS, meta, newField, isInput, visibleFields, type FieldMeta } from "@/lib/fields";
import type { ConditionOp, FieldType, FormField } from "@/lib/types";

const OPS: ConditionOp[] = ["eq", "neq", "contains", "gt", "lt", "answered", "empty"];

export default function FormBuilderPage() {
  const { t, locale } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const isNew = params.id === "new";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [collectRespondent, setCollectRespondent] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<"design" | "preview" | "settings">("design");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({});
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isNew) {
        const { data } = await supabase.from("forms").select("*").eq("id", params.id).single();
        if (data) {
          setTitle(data.title); setDescription(data.description ?? "");
          setAccessCode(data.access_code ?? ""); setCollectRespondent(!!data.collect_respondent);
          setFields(data.schema?.fields ?? []);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mark = () => setDirty(true);
  const L = (m: FieldMeta) => (locale === "ar" ? m.ar : m.en);
  const opLabel: Record<ConditionOp, string> = { eq: t.opEq, neq: t.opNeq, contains: t.opContains, gt: t.opGt, lt: t.opLt, answered: t.opAnswered, empty: t.opEmpty };

  function add(type: FieldType) {
    const f = newField(type, locale);
    const idx = sel ? fields.findIndex((x) => x.key === sel) + 1 : fields.length;
    const next = [...fields]; next.splice(idx, 0, f);
    setFields(next); setSel(f.key); mark(); setPaletteOpen(false);
  }
  function update(key: string, patch: Partial<FormField>) { setFields(fields.map((f) => (f.key === key ? { ...f, ...patch } : f))); mark(); }
  function remove(key: string) {
    setFields(fields.filter((f) => f.key !== key).map((f) => (f.showIf?.field === key ? { ...f, showIf: undefined } : f)));
    if (sel === key) setSel(null); mark();
  }
  function duplicate(key: string) {
    const i = fields.findIndex((f) => f.key === key); const c = { ...fields[i], key: `q_${Math.random().toString(36).slice(2, 8)}`, showIf: undefined };
    const next = [...fields]; next.splice(i + 1, 0, c); setFields(next); setSel(c.key); mark();
  }
  function move(i: number, j: number) {
    if (j < 0 || j >= fields.length) return;
    const next = [...fields]; const [x] = next.splice(i, 1); next.splice(j, 0, x); setFields(next); mark();
  }

  async function save(andBack = false) {
    if (!title.trim()) { setMsg(t.fillRequired); setTab("settings"); return; }
    setBusy(true); setMsg("");
    const payload = { title, description, access_code: accessCode.trim() || null, collect_respondent: collectRespondent, schema: { fields }, updated_at: new Date().toISOString() };
    let error;
    if (isNew) {
      const { data: u } = await supabase.auth.getUser();
      const res = await supabase.from("forms").insert({ ...payload, created_by: u.user!.id, owner_id: u.user!.id }).select("id").single();
      error = res.error;
      if (!error && res.data) { setDirty(false); router.replace(`/forms/builder/${res.data.id}`); }
    } else {
      ({ error } = await supabase.from("forms").update(payload).eq("id", params.id));
    }
    setBusy(false);
    if (error) setMsg(error.message); else { setDirty(false); if (andBack) router.push("/forms"); }
  }

  const inputFields = useMemo(() => fields.filter((f) => isInput(f.type)), [fields]);
  const selected = fields.find((f) => f.key === sel) ?? null;
  const groups = useMemo(() => (Object.keys(GROUP_LABELS) as FieldMeta["group"][]).map((g) => ({ g, items: FIELD_META.filter((m) => m.group === g) })), []);

  // ---------------- Palette
  const Palette = (
    <div className="space-y-4">
      {groups.map(({ g, items }) => (
        <div key={g}>
          <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted">{locale === "ar" ? GROUP_LABELS[g].ar : GROUP_LABELS[g].en}</div>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {items.map((m) => (
              <button key={m.type} onClick={() => add(m.type)} className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-start text-[13px] font-medium text-ink transition hover:bg-brand hover:text-white group">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface text-brand group-hover:bg-white/15 group-hover:text-white"><Icon name={m.icon} size={16} /></span>
                <span className="truncate">{L(m)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ---------------- Question card
  function Card({ f, i }: { f: FormField; i: number }) {
    const m = meta(f.type); const open = sel === f.key;
    return (
      <div draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null && drag !== i) move(drag, i); setDrag(null); }}
        onClick={() => setSel(f.key)}
        className={`group rounded-[22px] bg-white p-4 transition ${open ? "ring-2 ring-brand shadow-[0_12px_40px_-20px_rgba(5,66,57,.35)]" : "hover:shadow-[0_8px_30px_-20px_rgba(0,0,0,.25)]"}`}>
        <div className="flex items-start gap-3">
          <span className="mt-1 cursor-grab text-muted opacity-40 group-hover:opacity-100"><Icon name="drag" size={16} /></span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-brand"><Icon name={m.icon} size={17} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <span>{isInput(f.type) ? `Q${inputFields.indexOf(f) + 1}` : ""}</span><span>·</span><span>{L(m)}</span>
              {f.required && <span className="badge-up !py-0 !text-[10px]">*</span>}
              {f.showIf && <span className="badge-soft !py-0 !text-[10px] gap-1"><Icon name="branch" size={10} /> {t.logic}</span>}
            </div>
            {open ? (
              <input autoFocus className="input mt-1 !bg-surface !text-[15px] !font-medium" placeholder={f.type === "section" || f.type === "note" ? t.title : t.questionLabel} value={f.label} onChange={(e) => update(f.key, { label: e.target.value })} onClick={(e) => e.stopPropagation()} />
            ) : (
              <div className={`mt-0.5 truncate text-[15px] ${f.label ? "font-medium text-ink" : "font-light text-muted"}`}>{f.label || t.questionLabel}</div>
            )}
          </div>
          <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
            <button className="icon-btn !h-8 !w-8" title="↑" onClick={(e) => { e.stopPropagation(); move(i, i - 1); }}><Icon name="up" size={14} /></button>
            <button className="icon-btn !h-8 !w-8" title="↓" onClick={(e) => { e.stopPropagation(); move(i, i + 1); }}><Icon name="down" size={14} /></button>
            <button className="icon-btn !h-8 !w-8" title={t.duplicate} onClick={(e) => { e.stopPropagation(); duplicate(f.key); }}><Icon name="copy" size={14} /></button>
            <button className="icon-btn !h-8 !w-8 hover:!text-danger" title={t.delete} onClick={(e) => { e.stopPropagation(); remove(f.key); }}><Icon name="trash" size={14} /></button>
          </div>
        </div>

        {open && (
          <div className="mt-4 space-y-4 border-t border-line pt-4" onClick={(e) => e.stopPropagation()}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">{t.hintLabel}</label><input className="input !bg-surface" value={f.hint ?? ""} onChange={(e) => update(f.key, { hint: e.target.value })} /></div>
              {["text", "textarea", "number", "email", "phone"].includes(f.type) && (
                <div><label className="label">{t.placeholderLabel}</label><input className="input !bg-surface" value={f.placeholder ?? ""} onChange={(e) => update(f.key, { placeholder: e.target.value })} /></div>
              )}
              {f.type === "number" && (<>
                <div><label className="label">{t.minLabel}</label><input type="number" className="input !bg-surface" value={f.min ?? ""} onChange={(e) => update(f.key, { min: e.target.value === "" ? undefined : Number(e.target.value) })} /></div>
                <div><label className="label">{t.maxLabel}</label><input type="number" className="input !bg-surface" value={f.max ?? ""} onChange={(e) => update(f.key, { max: e.target.value === "" ? undefined : Number(e.target.value) })} /></div>
              </>)}
              {f.type === "rating" && (
                <div><label className="label">{t.scaleLabel}</label>
                  <div className="flex gap-1">{[3, 5, 7, 10].map((n) => <button key={n} onClick={() => update(f.key, { scale: n })} className={`rounded-full px-3 py-1.5 text-[13px] ${(f.scale ?? 5) === n ? "bg-brand text-white font-bold" : "bg-surface"}`}>{n}</button>)}</div>
                </div>
              )}
            </div>

            {m.hasOptions && (
              <div>
                <label className="label">{t.optionsLabel}</label>
                <div className="space-y-1.5">
                  {(f.options ?? []).map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <span className="text-muted"><Icon name={f.type === "checkbox" ? "checks" : f.type === "select" ? "list" : "radio"} size={14} /></span>
                      <input className="input !bg-surface !py-2" value={o} onChange={(e) => { const opts = [...(f.options ?? [])]; opts[oi] = e.target.value; update(f.key, { options: opts }); }} />
                      <button className="icon-btn !h-8 !w-8" onClick={() => update(f.key, { options: (f.options ?? []).filter((_, k) => k !== oi) })}><Icon name="x" size={12} /></button>
                    </div>
                  ))}
                  <button className="btn-ghost !py-1.5 text-[12px] !bg-white" onClick={() => update(f.key, { options: [...(f.options ?? []), ""] })}><Icon name="plus" size={12} /> {t.addOption}</button>
                </div>
              </div>
            )}
            {f.type === "likert" && (
              <div>
                <label className="label">{t.likertLabels}</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(f.likertLabels ?? []).map((l, li) => <input key={li} className="input !bg-surface !px-2 !py-2 !text-[12px]" value={l} onChange={(e) => { const ls = [...(f.likertLabels ?? [])]; ls[li] = e.target.value; update(f.key, { likertLabels: ls }); }} />)}
                </div>
              </div>
            )}

            {isInput(f.type) && (
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={f.required} onChange={(e) => update(f.key, { required: e.target.checked })} /> {t.required}</label>
              </div>
            )}

            {/* Logic */}
            <div className="rounded-2xl bg-surface p-3">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-medium"><Icon name="branch" size={15} className="text-brand" /> {t.logic}</div>
              {inputFields.filter((x) => x.key !== f.key && fields.indexOf(x) < i).length === 0 ? (
                <p className="text-[12px] font-light text-muted">{t.noLogic}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr]">
                  <select className="input !py-2 !text-[13px]" value={f.showIf?.field ?? ""} onChange={(e) => update(f.key, { showIf: e.target.value ? { field: e.target.value, op: f.showIf?.op ?? "eq", value: f.showIf?.value ?? "" } : undefined })}>
                    <option value="">{t.noLogic}</option>
                    {inputFields.filter((x) => x.key !== f.key && fields.indexOf(x) < i).map((x) => <option key={x.key} value={x.key}>Q{inputFields.indexOf(x) + 1} · {x.label || meta(x.type)[locale]}</option>)}
                  </select>
                  {f.showIf && (<>
                    <select className="input !py-2 !text-[13px]" value={f.showIf.op} onChange={(e) => update(f.key, { showIf: { ...f.showIf!, op: e.target.value as ConditionOp } })}>
                      {OPS.map((o) => <option key={o} value={o}>{opLabel[o]}</option>)}
                    </select>
                    {!["answered", "empty"].includes(f.showIf.op) && (() => {
                      const ref = fields.find((x) => x.key === f.showIf!.field);
                      const opts = ref?.type === "yesno" ? [t.yes + "|yes", t.no + "|no"] : ref?.type === "likert" ? (ref.likertLabels ?? []).map((l) => `${l}|${l}`) : (ref?.options ?? []).map((o) => `${o}|${o}`);
                      return opts.length > 0 ? (
                        <select className="input !py-2 !text-[13px]" value={f.showIf!.value ?? ""} onChange={(e) => update(f.key, { showIf: { ...f.showIf!, value: e.target.value } })}>
                          <option value="">{t.valueLabel}</option>
                          {opts.map((o) => { const [lab, val] = o.split("|"); return <option key={val} value={val}>{lab}</option>; })}
                        </select>
                      ) : (
                        <input className="input !py-2 !text-[13px]" placeholder={t.valueLabel} value={f.showIf!.value ?? ""} onChange={(e) => update(f.key, { showIf: { ...f.showIf!, value: e.target.value } })} />
                      );
                    })()}
                  </>)}
                </div>
              )}
              {f.showIf && <p className="mt-2 text-[12px] font-light text-muted">{t.showIf}: <b className="font-medium text-ink">Q{inputFields.findIndex((x) => x.key === f.showIf!.field) + 1}</b> {opLabel[f.showIf.op]} {f.showIf.value ? <b className="font-medium text-ink">«{f.showIf.value}»</b> : ""}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------- Preview
  const Preview = (
    <div className="mx-auto max-w-xl">
      <div className="panel p-6 sm:p-8">
        <h2 className="text-[24px] font-bold">{title || t.title}</h2>
        {description && <p className="mt-1 text-[14px] font-light text-muted">{description}</p>}
        <div className="card mt-5 space-y-5">
          {visibleFields(fields, previewValues).map((f) => (
            <FieldRenderer key={f.key} f={f} values={previewValues} setVal={(k, v) => setPreviewValues((p) => ({ ...p, [k]: v }))} onPhoto={(ff, file) => setPreviewValues((p) => ({ ...p, [ff.key]: file.name }))} onGps={(ff) => setPreviewValues((p) => ({ ...p, [ff.key]: { lat: 33.5138, lng: 36.2765 } }))} labels={{ capture: t.captureLocation, captured: t.locationCaptured, yes: t.yes, no: t.no, clear: t.clear }} locale={locale} />
          ))}
          <button className="btn-primary w-full !py-3">{t.submit}</button>
        </div>
      </div>
    </div>
  );

  // ---------------- Settings
  const Settings = (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="card space-y-4">
        <div><label className="label">{t.title} *</label><input className="input" value={title} onChange={(e) => { setTitle(e.target.value); mark(); }} /></div>
        <div><label className="label">{t.description}</label><textarea className="input" rows={2} value={description} onChange={(e) => { setDescription(e.target.value); mark(); }} /></div>
      </div>
      <div className="card space-y-4">
        <div className="card-title">{t.shareTitle}</div>
        <div><label className="label">{t.accessCode}</label><input className="input" dir="ltr" value={accessCode} onChange={(e) => { setAccessCode(e.target.value); mark(); }} placeholder="1234" /><p className="mt-1 text-[12px] font-light text-muted">{t.accessCodeHint}</p></div>
        <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={collectRespondent} onChange={(e) => { setCollectRespondent(e.target.checked); mark(); }} className="h-4 w-4 accent-[var(--brand)]" /> {t.collectRespondent}</label>
      </div>
    </div>
  );

  return (
    <div className="-m-1 flex h-[calc(100vh-9rem)] min-h-[600px] flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => router.push("/forms")} className="pill-icon" title={t.forms}><Icon name={locale === "ar" ? "arrow" : "arrow"} size={16} className={locale === "ar" ? "rotate-45" : "-rotate-[135deg]"} /></button>
        <div className="min-w-0">
          <input className="w-full bg-transparent text-[22px] font-bold text-ink outline-none placeholder:font-light placeholder:text-muted" placeholder={t.title} value={title} onChange={(e) => { setTitle(e.target.value); mark(); }} />
          <div className="text-[12px] font-light text-muted">{inputFields.length} {t.questions} · {dirty ? t.unsaved : isNew ? "" : t.saved}</div>
        </div>
        <div className="pill mx-auto flex gap-1 p-1">
          {(["design", "preview", "settings"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`nav-pill flex items-center gap-1.5 text-[13px] ${tab === k ? "nav-pill-active" : ""}`}>
              <Icon name={k === "design" ? "form" : k === "preview" ? "eye" : "settings"} size={14} /> {k === "design" ? t.design : k === "preview" ? t.preview : t.settingsTab}
            </button>
          ))}
        </div>
        <button className="btn-outline lg:hidden" onClick={() => setPaletteOpen(true)}><Icon name="plus" size={16} /> {t.addField}</button>
        <button className="btn-primary" disabled={busy} onClick={() => save(false)}>{busy ? t.loading : t.save}</button>
        <button className="btn-outline" disabled={busy} onClick={() => save(true)}>{t.save} & {t.forms}</button>
      </div>
      {msg && <p className="rounded-xl bg-[#f0e2e4] px-3 py-2 text-[13px] text-danger-dark">{msg}</p>}

      {tab === "design" && (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="card hidden min-h-0 overflow-auto !p-3 lg:block">
            <div className="mb-3 px-1 text-[13px] font-bold">{t.builderPalette}</div>
            {Palette}
          </aside>
          <section className="card min-h-0 overflow-auto !p-3 sm:!p-4" onClick={() => setSel(null)}>
            {fields.length === 0 ? (
              <div className="empty flex h-full flex-col items-center justify-center gap-3">
                <Icon name="form" size={36} className="text-brand/60" />
                <span>{t.builderEmpty}</span>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-3">
                {fields.map((f, i) => <Card key={f.key} f={f} i={i} />)}
                <button onClick={(e) => { e.stopPropagation(); setPaletteOpen(true); }} className="btn-outline w-full lg:hidden"><Icon name="plus" size={16} /> {t.addField}</button>
              </div>
            )}
          </section>
        </div>
      )}
      {tab === "preview" && <div className="min-h-0 flex-1 overflow-auto rounded-[22px] bg-page p-3 sm:p-6">{Preview}</div>}
      {tab === "settings" && <div className="min-h-0 flex-1 overflow-auto">{Settings}</div>}

      {paletteOpen && (
        <div className="fixed inset-0 z-[60] bg-black/30 lg:hidden" onClick={() => setPaletteOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-auto rounded-t-[26px] bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><span className="text-[15px] font-bold">{t.builderPalette}</span><button className="icon-btn" onClick={() => setPaletteOpen(false)}><Icon name="x" size={14} /></button></div>
            {Palette}
          </div>
        </div>
      )}
    </div>
  );
}
