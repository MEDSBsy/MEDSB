"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { switchLocale, useI18n } from "@/components/I18nProvider";
import { branding } from "@/lib/branding";
import FieldRenderer, { type Values } from "@/components/FieldRenderer";
import { publicOutbox, fileToB64, syncPublicOutbox } from "@/lib/offline";
import { visibleFields, isInput } from "@/lib/fields";
import type { FormField } from "@/lib/types";

type PubForm = { id: string; title: string; description: string | null; schema: { fields: FormField[] }; version: number; collect_respondent: boolean; requires_code: boolean; code_ok: boolean };

export default function PublicSurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t, locale } = useI18n();
  const supabase = createClient();
  const [form, setForm] = useState<PubForm | null | undefined>(undefined);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState("");
  const [values, setValues] = useState<Values>({});
  const [photos, setPhotos] = useState<Record<string, File>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"" | "sent" | "queued">("");
  const [msg, setMsg] = useState("");

  async function load(c?: string) {
    const { data } = await supabase.rpc("get_public_form", { p_token: token, p_code: c ?? null });
    const row = (data as PubForm[] | null)?.[0] ?? null;
    setForm(row);
    if (row && row.requires_code && !row.code_ok && c) setCodeMsg(t.wrongCode); else setCodeMsg("");
  }
  useEffect(() => { load(); syncPublicOutbox(supabase); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const setVal = (k: string, v: unknown) => setValues((p) => ({ ...p, [k]: v }));

  async function onPhoto(f: FormField, file: File) {
    setPhotos((p) => ({ ...p, [f.key]: file }));
    setVal(f.key, file.name);
  }
  function onGps(f: FormField) {
    navigator.geolocation.getCurrentPosition(
      (pos) => setVal(f.key, { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => setMsg(t.locationNeeded), { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function submit() {
    if (!form) return;
    for (const f of visibleFields(form.schema.fields, values).filter((x) => isInput(x.type))) {
      const v = values[f.key];
      if (f.required && (v == null || v === "" || (Array.isArray(v) && v.length === 0))) { setMsg(`${t.fillRequired}: ${f.label}`); return; }
    }
    if (form.collect_respondent && !name.trim()) { setMsg(`${t.fillRequired}: ${t.yourNameReq}`); return; }
    setBusy(true); setMsg("");
    const gpsField = form.schema.fields.find((f) => f.type === "gps");
    const gps = gpsField ? (values[gpsField.key] as { accuracy?: number } | undefined) : undefined;
    const item = {
      id: crypto.randomUUID(), token, code: code || null, data: values, accuracy: gps?.accuracy ?? null,
      device: { ua: navigator.userAgent }, name, phone,
      photos: await Promise.all(Object.entries(photos).map(async ([k, f]) => ({ field_key: k, name: f.name, type: f.type, b64: await fileToB64(f) }))),
      created_at: new Date().toISOString(),
    };
    await publicOutbox.add(item);
    const n = await syncPublicOutbox(supabase);
    setBusy(false);
    setDone(n > 0 ? "sent" : "queued");
  }

  function reset() { setValues({}); setPhotos({}); setDone(""); setMsg(""); }

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen p-2 sm:p-4">
      <div className="panel mx-auto max-w-xl p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src={branding.logo} alt="" width={32} height={32} className="rounded-lg" />
            <span className="text-[14px] font-bold">{locale === "ar" ? branding.shortAr : branding.shortEn}</span>
          </div>
          <button onClick={() => switchLocale(locale)} className="pill-icon"><span className="text-[11px] font-bold">{locale === "ar" ? "EN" : "ع"}</span></button>
        </div>
        {children}
      </div>
    </main>
  );

  if (form === undefined) return shell(<p className="text-muted font-light">{t.loading}</p>);
  if (form === null) return shell(<div className="empty">{t.surveyClosed}</div>);

  if (form.requires_code && !form.code_ok) {
    return shell(
      <div className="space-y-4">
        <h1 className="text-[24px] font-bold">{form.title}</h1>
        <p className="text-[14px] font-light text-muted">{t.enterCode}</p>
        <input className="input text-center text-[20px] font-black tracking-widest" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} />
        {codeMsg && <p className="text-[13px] text-danger">{codeMsg}</p>}
        <button className="btn-primary w-full !py-3" onClick={() => load(code)}>{t.continueBtn}</button>
      </div>
    );
  }

  if (done) {
    return shell(
      <div className="card-brand">
        <p className="text-[18px] font-bold">{done === "sent" ? t.thankYou : t.savedOffline}</p>
        <button onClick={reset} className="btn-outline mt-4 !bg-white">{t.answerAgain}</button>
      </div>
    );
  }

  return shell(
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight">{form.title}</h1>
        {form.description && <p className="mt-1 text-[14px] font-light text-muted">{form.description}</p>}
      </div>
      <div className="card space-y-5">
        {form.collect_respondent && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">{t.yourNameReq} <span className="text-danger">*</span></label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="label">{t.yourPhoneOpt}</label><input className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
        )}
        {visibleFields(form.schema.fields, values).map((f) => (
          <FieldRenderer key={f.key} f={f} values={values} setVal={setVal} onPhoto={onPhoto} onGps={onGps} labels={{ capture: t.captureLocation, captured: t.locationCaptured, yes: t.yes, no: t.no, clear: t.clear }} locale={locale} />
        ))}
        {msg && <p className="rounded-xl bg-[#f0e2e4] px-3 py-2 text-[13px] text-danger-dark">{msg}</p>}
        <button className="btn-primary w-full !py-3" onClick={submit} disabled={busy}>{busy ? t.loading : t.submit}</button>
      </div>
    </div>
  );
}
