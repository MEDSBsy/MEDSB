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
    <div className="flex h-[calc(100vh-10rem)] min-h-[560px] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="page-title me-auto">{t.map} <span className="light">{filtered.length} {t.points}</span></h1>
        <select value={formFilter} onChange={(e) => setFormFilter(e.target.value)} className="input !w-auto !py-2">
          <option value="all">{t.filterForm}: {t.mapAll}</option>
          {forms.map(([id, title]) => (
            <option key={id} value={id}>{title}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input !w-auto !py-2">
          <option value="all">{t.filterStatus}: {t.mapAll}</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select onChange={(e) => { if (e.target.value) { exportAs(e.target.value as "geojson" | "kml" | "shp"); e.target.value = ""; } }} disabled={filtered.length === 0}
          className="btn-primary !py-2 text-[13px] disabled:opacity-40" defaultValue="">
          <option value="" disabled>{t.export}</option>
          <option value="geojson">GeoJSON</option>
          <option value="kml">KML (Google Earth)</option>
          <option value="shp">Shapefile (.zip)</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(statusLabels).map(([k, v]) => (
          <span key={k} className="badge-soft gap-1.5">
            <span className="dot" style={{ background: STATUS_COLORS[k as keyof typeof STATUS_COLORS] }} /> {v}
          </span>
        ))}
      </div>

      <div className="card relative flex-1 min-h-[400px] !p-2">
        {loading ? (
          <p className="text-muted font-light">{t.loading}</p>
        ) : rows.length === 0 ? (
          <div className="empty flex h-full items-center justify-center">{t.mapNoLocation}</div>
        ) : (
          <SubmissionsMap
            rows={filtered}
            rtl={locale === "ar"}
            labels={{ status: statusLabels, details: t.viewDetails }}
            onSelect={(id) => setSelected(rows.find((r) => r.id === id) ?? null)}
          />
        )}
        {selected && (
          <div className="absolute inset-y-2 end-2 w-full max-w-sm overflow-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="section-title">{selected.form_title}</h2>
              <button onClick={() => setSelected(null)} className="icon-btn">✕</button>
            </div>
            <p className="card-sub">{selected.project_name} · {statusLabels[selected.status]} · {new Date(selected.submitted_at).toLocaleString()}</p>
            <table className="tbl mt-3">
              <tbody>
                {Object.entries(selected.data).map(([k, v]) => (
                  <tr key={k}>
                    <td className="!py-2 font-medium text-muted align-top">{k}</td>
                    <td className="!py-2 break-words">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}</td>
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
