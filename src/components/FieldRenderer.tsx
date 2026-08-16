"use client";

import type { FormField } from "@/lib/types";

export type Values = Record<string, unknown>;

export default function FieldRenderer({
  f, values, setVal, onPhoto, onGps, labels,
}: {
  f: FormField;
  values: Values;
  setVal: (k: string, v: unknown) => void;
  onPhoto: (f: FormField, file: File) => void;
  onGps: (f: FormField) => void;
  labels: { capture: string; captured: string };
}) {
  const v = values[f.key];
  return (
    <div>
      <label className="label">
        {f.label} {f.required && <span className="text-danger">*</span>}
      </label>
      {f.type === "text" && <input className="input" value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />}
      {f.type === "textarea" && <textarea className="input" rows={3} value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />}
      {f.type === "number" && <input className="input" type="number" dir="ltr" value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />}
      {f.type === "date" && <input className="input" type="date" value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />}
      {f.type === "select" && (
        <select className="input" value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)}>
          <option value="" />
          {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {f.type === "radio" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(f.options ?? []).map((o) => (
            <button type="button" key={o} onClick={() => setVal(f.key, o)}
              className={`rounded-full px-4 py-2.5 text-start text-[14px] transition ${v === o ? "bg-brand font-bold text-white" : "bg-white text-ink"}`}>{o}</button>
          ))}
        </div>
      )}
      {f.type === "checkbox" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(f.options ?? []).map((o) => {
            const arr = (v as string[]) ?? [];
            const on = arr.includes(o);
            return (
              <button type="button" key={o} onClick={() => setVal(f.key, on ? arr.filter((x) => x !== o) : [...arr, o])}
                className={`rounded-full px-4 py-2.5 text-start text-[14px] transition ${on ? "bg-brand font-bold text-white" : "bg-white text-ink"}`}>{on ? "✓ " : ""}{o}</button>
            );
          })}
        </div>
      )}
      {f.type === "photo" && (
        <div>
          <input className="input" type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && onPhoto(f, e.target.files[0])} />
          {typeof v === "string" && <p className="mt-1 text-[12px] text-brand">✓ {v}</p>}
        </div>
      )}
      {f.type === "gps" && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-outline" onClick={() => onGps(f)}>📍 {labels.capture}</button>
          {v != null && (
            <span className="badge-soft" dir="ltr">✓ {(v as { lat: number }).lat.toFixed(5)}, {(v as { lng: number }).lng.toFixed(5)}</span>
          )}
        </div>
      )}
    </div>
  );
}
