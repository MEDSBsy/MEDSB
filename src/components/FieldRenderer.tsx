"use client";

import { useRef } from "react";
import type { FormField } from "@/lib/types";
import { Icon } from "@/components/Icons";

export type Values = Record<string, unknown>;

const chip = (on: boolean) => `rounded-full px-4 py-2.5 text-start text-[14px] transition ${on ? "bg-brand font-bold text-white" : "bg-white text-ink hover:bg-[#f2f0ea]"}`;

export default function FieldRenderer({
  f, values, setVal, onPhoto, onGps, labels, locale,
}: {
  f: FormField;
  values: Values;
  setVal: (k: string, v: unknown) => void;
  onPhoto: (f: FormField, file: File) => void;
  onGps: (f: FormField) => void;
  labels: { capture: string; captured: string; yes: string; no: string; clear: string };
  locale: "ar" | "en";
}) {
  const v = values[f.key];

  if (f.type === "section") return (
    <div className="pt-2">
      <h3 className="text-[18px] font-black text-ink">{f.label}</h3>
      {f.hint && <p className="mt-0.5 text-[13px] font-light text-muted">{f.hint}</p>}
      <div className="mt-2 h-px bg-line" />
    </div>
  );
  if (f.type === "note") return (
    <div className="flex gap-3 rounded-2xl bg-white p-4 text-[14px]">
      <Icon name="info" size={18} className="mt-0.5 shrink-0 text-brand" />
      <div><div className="font-medium">{f.label}</div>{f.hint && <div className="font-light text-muted">{f.hint}</div>}</div>
    </div>
  );

  return (
    <div>
      <label className="label !text-[15px] !text-ink">
        {f.label} {f.required && <span className="text-danger">*</span>}
      </label>
      {f.hint && <p className="-mt-1 mb-2 text-[12px] font-light text-muted">{f.hint}</p>}

      {f.type === "text" && <input className="input" placeholder={f.placeholder} value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />}
      {f.type === "textarea" && <textarea className="input" rows={3} placeholder={f.placeholder} value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />}
      {f.type === "number" && <input className="input" type="number" dir="ltr" min={f.min} max={f.max} placeholder={f.placeholder} value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />}
      {f.type === "email" && <input className="input" type="email" dir="ltr" placeholder={f.placeholder ?? "name@example.com"} value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />}
      {f.type === "phone" && <input className="input" type="tel" dir="ltr" placeholder={f.placeholder ?? "09xxxxxxxx"} value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />}
      {f.type === "date" && <input className="input" type="date" value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />}
      {f.type === "time" && <input className="input" type="time" value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />}

      {f.type === "select" && (
        <select className="input" value={(v as string) ?? ""} onChange={(e) => setVal(f.key, e.target.value)}>
          <option value="" />
          {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {f.type === "radio" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(f.options ?? []).map((o) => <button type="button" key={o} onClick={() => setVal(f.key, o)} className={chip(v === o)}>{o}</button>)}
        </div>
      )}
      {f.type === "checkbox" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(f.options ?? []).map((o) => {
            const arr = (v as string[]) ?? []; const on = arr.includes(o);
            return <button type="button" key={o} onClick={() => setVal(f.key, on ? arr.filter((x) => x !== o) : [...arr, o])} className={chip(on)}>{on ? "✓ " : ""}{o}</button>;
          })}
        </div>
      )}
      {f.type === "yesno" && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setVal(f.key, "yes")} className={chip(v === "yes") + " text-center"}>{labels.yes}</button>
          <button type="button" onClick={() => setVal(f.key, "no")} className={chip(v === "no") + " text-center"}>{labels.no}</button>
        </div>
      )}
      {f.type === "rating" && (
        <div className="flex gap-1" dir="ltr">
          {[...Array(f.scale ?? 5)].map((_, i) => {
            const n = i + 1; const on = Number(v ?? 0) >= n;
            return (
              <button type="button" key={n} onClick={() => setVal(f.key, n)} className="p-1" aria-label={String(n)}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill={on ? "#b9a779" : "none"} stroke={on ? "#b9a779" : "#c9c4b3"} strokeWidth="1.6"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" /></svg>
              </button>
            );
          })}
        </div>
      )}
      {f.type === "likert" && (
        <div className="grid grid-cols-5 gap-1.5">
          {(f.likertLabels ?? []).map((l, i) => (
            <button type="button" key={i} onClick={() => setVal(f.key, l)} className={`rounded-2xl px-2 py-3 text-center text-[12px] leading-tight transition ${v === l ? "bg-brand font-bold text-white" : "bg-white text-ink"}`}>{l}</button>
          ))}
        </div>
      )}
      {f.type === "photo" && (
        <div>
          <input className="input" type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && onPhoto(f, e.target.files[0])} />
          {typeof v === "string" && v && <p className="mt-1 text-[12px] text-brand">✓ {v}</p>}
        </div>
      )}
      {f.type === "gps" && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-outline" onClick={() => onGps(f)}><Icon name="pin" size={16} /> {labels.capture}</button>
          {v != null && <span className="badge-soft" dir="ltr">✓ {(v as { lat: number }).lat.toFixed(5)}, {(v as { lng: number }).lng.toFixed(5)}</span>}
        </div>
      )}
      {f.type === "signature" && <SignaturePad value={(v as string) ?? ""} onChange={(d) => setVal(f.key, d)} clearLabel={labels.clear} />}
    </div>
  );
}

function SignaturePad({ value, onChange, clearLabel }: { value: string; onChange: (dataUrl: string) => void; clearLabel: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  return (
    <div>
      <canvas ref={ref} width={600} height={200} className="h-40 w-full touch-none rounded-2xl bg-white"
        onPointerDown={(e) => { drawing.current = true; const c = ref.current!.getContext("2d")!; const p = pos(e); c.beginPath(); c.moveTo(p.x * 600 / ref.current!.clientWidth, p.y * 200 / ref.current!.clientHeight); }}
        onPointerMove={(e) => { if (!drawing.current) return; const c = ref.current!.getContext("2d")!; c.lineWidth = 2.5; c.lineCap = "round"; c.strokeStyle = "#161616"; const p = pos(e); c.lineTo(p.x * 600 / ref.current!.clientWidth, p.y * 200 / ref.current!.clientHeight); c.stroke(); }}
        onPointerUp={() => { drawing.current = false; onChange(ref.current!.toDataURL("image/png")); }}
        onPointerLeave={() => { drawing.current = false; }}
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[12px] font-light text-muted">{value ? "✓" : ""}</span>
        <button type="button" className="text-[12px] text-muted underline" onClick={() => { ref.current!.getContext("2d")!.clearRect(0, 0, 600, 200); onChange(""); }}>{clearLabel}</button>
      </div>
    </div>
  );
}
