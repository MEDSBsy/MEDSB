"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import type { SubmissionMapRow } from "@/lib/types";
import { toGeoJSON, STATUS_COLORS } from "@/components/SubmissionsMap";
import { toKML, toShapefileZip, download } from "@/lib/geoexport";

const SubmissionsMap = dynamic(() => import("@/components/SubmissionsMap"), { ssr: false });

export default function MapPage() {
  const { t, locale } = useI18n();
  const supabase = createClient();
  const [rows, setRows] = useState<SubmissionMapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formFilter, setFormFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<SubmissionMapRow | null>(null);

  useEffect(() => {
    supabase
      .from("submissions_map")
      .select("id, form_id, form_title, project_id, project_name, status, submitted_at, submitted_by_name, location_accuracy_m, data, lat, lng")
      .order("submitted_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as SubmissionMapRow[]) ?? []);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forms = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.form_id, r.form_title));
    return [...m.entries()];
  }, [rows]);

  const filtered = useMemo(
    () => rows.filter((r) => (formFilter === "all" || r.form_id === formFilter) && (statusFilter === "all" || r.status === statusFilter)),
    [rows, formFilter, statusFilter]
  );

  async function exportAs(fmt: "geojson" | "kml" | "shp") {
    const fc = toGeoJSON(filtered);
    const base = `submissions-${new Date().toISOString().slice(0, 10)}`;
    if (fmt === "geojson") download(new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" }), `${base}.geojson`);
    else if (fmt === "kml") download(new Blob([toKML(fc, base)], { type: "application/vnd.google-earth.kml+xml" }), `${base}.kml`);
    else download(await toShapefileZip(fc, base), `${base}-shp.zip`);
  }

  const statusLabels: Record<string, string> = { submitted: t.submitted, approved: t.approved, rejected: t.rejected };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold me-auto">{t.map}</h1>
        <select value={formFilter} onChange={(e) => setFormFilter(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm">
          <option value="all">{t.filterForm}: {t.mapAll}</option>
          {forms.map(([id, title]) => (
            <option key={id} value={id}>{title}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm">
          <option value="all">{t.filterStatus}: {t.mapAll}</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select onChange={(e) => { if (e.target.value) { exportAs(e.target.value as "geojson" | "kml" | "shp"); e.target.value = ""; } }} disabled={filtered.length === 0}
          className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-sm text-white disabled:opacity-40" defaultValue="">
          <option value="" disabled>{t.export}</option>
          <option value="geojson">GeoJSON</option>
          <option value="kml">KML (Google Earth)</option>
          <option value="shp">Shapefile (.zip)</option>
        </select>
        <span className="text-sm text-gray-500">{filtered.length} {t.points}</span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        {Object.entries(statusLabels).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: STATUS_COLORS[k as keyof typeof STATUS_COLORS] }} /> {v}
          </span>
        ))}
      </div>

      <div className="relative flex-1 min-h-[400px]">
        {loading ? (
          <p className="text-gray-500">{t.loading}</p>
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-gray-500">{t.mapNoLocation}</div>
        ) : (
          <SubmissionsMap
            rows={filtered}
            rtl={locale === "ar"}
            labels={{ status: statusLabels, details: t.viewDetails }}
            onSelect={(id) => setSelected(rows.find((r) => r.id === id) ?? null)}
          />
        )}
        {selected && (
          <div className="absolute inset-y-0 end-0 w-full max-w-sm overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">{selected.form_title}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-500">✕</button>
            </div>
            <p className="text-xs text-gray-500">{selected.project_name} · {statusLabels[selected.status]} · {new Date(selected.submitted_at).toLocaleString()}</p>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {Object.entries(selected.data).map(([k, v]) => (
                  <tr key={k} className="border-b">
                    <td className="py-1 pe-2 font-medium text-gray-600 align-top">{k}</td>
                    <td className="py-1 break-words">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
