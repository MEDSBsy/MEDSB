"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { outbox, fileToB64, syncOutbox } from "@/lib/offline";
import { useI18n } from "@/components/I18nProvider";
import type { FormRow, FormField } from "@/lib/types";

export default function FillFormPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<FormRow | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("forms").select("*").eq("id", params.id).single();
      setForm(data as FormRow);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setVal(key: string, v: unknown) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  const [pendingPhotos, setPendingPhotos] = useState<Record<string, File>>({});
  async function uploadPhoto(field: FormField, file: File) {
    if (!navigator.onLine) {
      setPendingPhotos((p) => ({ ...p, [field.key]: file }));
      setVal(field.key, `(offline) ${file.name}`);
      return;
    }
    setMsg(t.uploading);
    const path = `${params.id}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file);
    if (error) {
      setPendingPhotos((p) => ({ ...p, [field.key]: file }));
      setVal(field.key, `(offline) ${file.name}`);
      setMsg("");
    } else {
      setVal(field.key, path);
      setMsg("");
    }
  }

  function captureGps(field: FormField) {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setVal(field.key, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => setMsg(err.message),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function submit() {
    if (!form) return;
    for (const f of form.schema.fields) {
      const v = values[f.key];
      if (f.required && (v === undefined || v === "" || (Array.isArray(v) && v.length === 0))) {
        setMsg(t.fillRequired);
        return;
      }
    }
    setBusy(true);
    setMsg("");
    const gpsField = form.schema.fields.find((f) => f.type === "gps");
    const gps = gpsField ? (values[gpsField.key] as { lat: number; lng: number; accuracy: number } | undefined) : undefined;
    const clientId = crypto.randomUUID();
    const photos = await Promise.all(
      Object.entries(pendingPhotos).map(async ([field_key, f]) => ({ field_key, name: f.name, type: f.type, b64: await fileToB64(f) }))
    );
    const queued = {
      id: clientId, form_id: form.id, form_version: form.version, data: values,
      location_accuracy_m: gps?.accuracy ?? null, device_info: { ua: navigator.userAgent }, photos,
      created_at: new Date().toISOString(),
    };
    if (!navigator.onLine || photos.length > 0) {
      await outbox.add(queued);
      window.dispatchEvent(new Event("outbox-changed"));
      const n = await syncOutbox(supabase);
      window.dispatchEvent(new Event("outbox-changed"));
      if (n === 0) { setBusy(false); setOk(true); setMsg(t.savedOffline); setTimeout(() => router.push("/forms"), 2500); return; }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const res = await supabase.from("submissions").insert({
        form_id: form.id, form_version: form.version, data: values, submitted_by: userData.user!.id,
        client_id: clientId, location_accuracy_m: gps?.accuracy ?? null, device_info: { ua: navigator.userAgent },
      });
      if (res.error) {
        await outbox.add(queued);
        window.dispatchEvent(new Event("outbox-changed"));
        setBusy(false); setOk(true); setMsg(t.savedOffline); setTimeout(() => router.push("/forms"), 2500); return;
      }
    }
    setBusy(false);
    setOk(true);
    setTimeout(() => router.push("/submissions"), 1200);
  }

  if (!form) return <p className="text-muted font-light">{t.loading}</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="page-title">{form.title}</h1>
      {form.description && <p className="text-muted">{form.description}</p>}
      <div className="card space-y-5">
        {form.schema.fields.map((f) => (
          <div key={f.key}>
            <label className="label">
              {f.label} {f.required && <span className="text-umber-500">*</span>}
            </label>
            {f.type === "text" && (
              <input className="input" value={(values[f.key] as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />
            )}
            {f.type === "textarea" && (
              <textarea className="input" rows={3} value={(values[f.key] as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />
            )}
            {f.type === "number" && (
              <input className="input" type="number" dir="ltr" value={(values[f.key] as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />
            )}
            {f.type === "date" && (
              <input className="input" type="date" value={(values[f.key] as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />
            )}
            {f.type === "select" && (
              <select className="input" value={(values[f.key] as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)}>
                <option value="" />
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            )}
            {f.type === "radio" && (
              <div className="space-y-1">
                {(f.options ?? []).map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <input type="radio" name={f.key} checked={values[f.key] === o} onChange={() => setVal(f.key, o)} />
                    {o}
                  </label>
                ))}
              </div>
            )}
            {f.type === "checkbox" && (
              <div className="space-y-1">
                {(f.options ?? []).map((o) => {
                  const arr = (values[f.key] as string[]) ?? [];
                  return (
                    <label key={o} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={arr.includes(o)}
                        onChange={(e) =>
                          setVal(f.key, e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))
                        }
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            )}
            {f.type === "photo" && (
              <div>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => e.target.files?.[0] && uploadPhoto(f, e.target.files[0])}
                />
                {typeof values[f.key] === "string" && (
                  <p className="mt-1 text-xs text-forest-700">✓ {values[f.key] as string}</p>
                )}
              </div>
            )}
            {f.type === "gps" && (
              <div className="flex items-center gap-3">
                <button type="button" className="btn-outline" onClick={() => captureGps(f)}>
                  📍 {t.captureLocation}
                </button>
                {values[f.key] != null && (
                  <span className="text-xs text-forest-700">
                    ✓ {t.locationCaptured} (
                    {(values[f.key] as { lat: number }).lat.toFixed(5)},{" "}
                    {(values[f.key] as { lng: number }).lng.toFixed(5)})
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {msg && <p className="text-sm text-umber-500">{msg}</p>}
        {ok && <p className="text-sm font-bold text-forest-700">{t.sentSuccess} ✓</p>}
        <button className="btn-primary w-full" onClick={submit} disabled={busy || ok}>
          {busy ? t.loading : t.submit}
        </button>
      </div>
    </div>
  );
}
