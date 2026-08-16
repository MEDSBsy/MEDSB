"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { outbox, fileToB64, syncOutbox } from "@/lib/offline";
import { useI18n } from "@/components/I18nProvider";
import type { FormRow, FormField } from "@/lib/types";
import FieldRenderer from "@/components/FieldRenderer";
import { visibleFields, isInput } from "@/lib/fields";

export default function FillFormPage() {
  const { t, locale } = useI18n();
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
    for (const f of visibleFields(form.schema.fields, values).filter((x) => isInput(x.type))) {
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
        {visibleFields(form.schema.fields, values).map((f) => (
          <FieldRenderer key={f.key} f={f} values={values} setVal={setVal} onPhoto={uploadPhoto} onGps={captureGps} labels={{ capture: t.captureLocation, captured: t.locationCaptured, yes: t.yes, no: t.no, clear: t.clear }} locale={locale} />
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
