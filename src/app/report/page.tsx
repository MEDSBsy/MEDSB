"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { switchLocale, useI18n } from "@/components/I18nProvider";
import { branding } from "@/lib/branding";
import type { ReportCategory } from "@/lib/types";

const CATEGORIES: ReportCategory[] = ["flood", "fire", "earthquake", "building", "road", "medical", "other"];

export default function PublicReportPage() {
  const { t, locale } = useI18n();
  const supabase = createClient();
  const [category, setCategory] = useState<ReportCategory>("other");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  const catLabel: Record<ReportCategory, string> = {
    flood: t.catFlood, fire: t.catFire, earthquake: t.catEarthquake, building: t.catBuilding,
    road: t.catRoad, medical: t.catMedical, other: t.catOther,
  };

  function getLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!loc) { setMsg(t.locationNeeded); return; }
    setBusy(true); setMsg("");
    let photoPath: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("public-reports").upload(path, file, { contentType: file.type });
      if (!upErr) photoPath = path;
    }
    const { error } = await supabase.rpc("submit_public_report", {
      p_category: category, p_description: description, p_lat: loc.lat, p_lng: loc.lng,
      p_accuracy: loc.accuracy, p_name: name, p_phone: phone, p_photo_path: photoPath,
      p_device: { ua: navigator.userAgent },
    });
    setBusy(false);
    if (error) setMsg(t.reportError); else setDone(true);
  }

  function reset() {
    setDone(false); setDescription(""); setFile(null); setLoc(null); setMsg("");
  }

  return (
    <main className="min-h-screen bg-[var(--brand-light)] px-4 py-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-5 shadow">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src={branding.logo} alt="" width={36} height={36} />
            <div className="font-bold text-[var(--brand-dark)]">{locale === "ar" ? branding.nameAr : branding.nameEn}</div>
          </div>
          <button onClick={() => switchLocale(locale === "ar" ? "en" : "ar")} className="text-xs text-gray-500 underline">
            {locale === "ar" ? "English" : "العربية"}
          </button>
        </div>
        <h1 className="text-xl font-black text-[var(--brand-dark)]">{t.publicReport}</h1>
        <p className="mb-4 text-sm font-light text-gray-600">{t.reportIntro}</p>

        {done ? (
          <div className="rounded-xl bg-green-50 p-4 text-green-800">
            <p>{t.reportSent}</p>
            <button onClick={reset} className="mt-3 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm text-white">{t.newReport}</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.category}</span>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button type="button" key={c} onClick={() => setCategory(c)}
                    className={`rounded-lg border px-3 py-2 text-sm ${category === c ? "border-[var(--brand)] bg-[var(--brand-light)] font-semibold" : "border-gray-200"}`}>
                    {catLabel[c]}
                  </button>
                ))}
              </div>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.reportDesc}</span>
              <textarea required minLength={5} maxLength={2000} rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border px-3 py-2" />
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={getLocation} disabled={locating}
                className="rounded-lg border border-[var(--brand)] px-3 py-2 text-sm text-[var(--brand)] disabled:opacity-50">
                {locating ? t.locating : t.getLocation}
              </button>
              {loc && <span className="text-xs text-green-700">✓ {t.locationSet} ({loc.lat.toFixed(5)}, {loc.lng.toFixed(5)})</span>}
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.attachPhoto}</span>
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder={t.yourName} value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              <input placeholder={t.yourPhone} value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" dir="ltr" />
            </div>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-[var(--brand)] py-2.5 font-medium text-white disabled:opacity-50">
              {busy ? "..." : t.sendReport}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
