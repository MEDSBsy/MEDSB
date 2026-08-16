"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import { toGeoJSON } from "@/components/SubmissionsMap";
import { toKML, toShapefileZip, download } from "@/lib/geoexport";
import type { PublicReportRow, ReportCategory, ReportStatus, SubmissionMapRow } from "@/lib/types";

const SubmissionsMap = dynamic(() => import("@/components/SubmissionsMap"), { ssr: false });

const STATUS_TO_MAP: Record<ReportStatus, SubmissionMapRow["status"]> = {
  pending: "submitted", verified: "approved", resolved: "approved", rejected: "rejected",
};

export default function ReportsPage() {
  const { t, locale } = useI18n();
  const supabase = createClient();
  const [rows, setRows] = useState<PublicReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("pending");
  const [selected, setSelected] = useState<PublicReportRow | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const catLabel: Record<ReportCategory, string> = {
    flood: t.catFlood, fire: t.catFire, earthquake: t.catEarthquake, building: t.catBuilding,
    road: t.catRoad, medical: t.catMedical, other: t.catOther,
  };
  const statusLabel: Record<ReportStatus, string> = { pending: t.pending, verified: t.verified, rejected: t.rejected, resolved: t.resolved };

  async function load() {
    const { data } = await supabase.from("public_reports_map").select("*").order("created_at", { ascending: false });
    setRows((data as PublicReportRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    setPhotoUrl(null); setNote(selected?.review_note ?? "");
    if (selected?.photo_path) {
      supabase.storage.from("public-reports").createSignedUrl(selected.photo_path, 3600).then(({ data }) => setPhotoUrl(data?.signedUrl ?? null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const filtered = useMemo(() => rows.filter((r) => statusFilter === "all" || r.status === statusFilter), [rows, statusFilter]);

  const mapRows: SubmissionMapRow[] = useMemo(() => filtered.map((r) => ({
    id: r.id, form_id: r.category, form_title: catLabel[r.category], project_id: "public", project_name: t.publicReports,
    status: STATUS_TO_MAP[r.status], submitted_at: r.created_at, submitted_by_name: r.reporter_name,
    location_accuracy_m: r.location_accuracy_m, data: { description: r.description }, lat: r.lat, lng: r.lng,
  })), [filtered, t, catLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(status: ReportStatus) {
    if (!selected) return;
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("public_reports").update({ status, reviewed_by: u.user!.id, reviewed_at: new Date().toISOString(), review_note: note || null }).eq("id", selected.id);
    setSelected(null); load();
  }

  async function exportAs(fmt: "geojson" | "kml" | "shp") {
    const fc = toGeoJSON(mapRows);
    fc.features.forEach((f, i) => { const r = filtered[i]; f.properties = { id: r.id, category: r.category, status: r.status, created_at: r.created_at, description: r.description, reporter_name: r.reporter_name ?? "", reporter_phone: r.reporter_phone ?? "", accuracy_m: r.location_accuracy_m }; });
    const base = `reports-${new Date().toISOString().slice(0, 10)}`;
    if (fmt === "geojson") download(new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" }), `${base}.geojson`);
    else if (fmt === "kml") download(new Blob([toKML(fc, base)], { type: "application/vnd.google-earth.kml+xml" }), `${base}.kml`);
    else download(await toShapefileZip(fc, base), `${base}-shp.zip`);
  }

  const publicLink = typeof window !== "undefined" ? `${window.location.origin}/report` : "/report";

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[560px] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="page-title me-auto">{t.publicReports} <span className="light">{filtered.length}</span></h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "all")} className="input !w-auto !py-2">
          <option value="all">{t.mapAll}</option>
          {(Object.keys(statusLabel) as ReportStatus[]).map((k) => <option key={k} value={k}>{statusLabel[k]}</option>)}
        </select>
        <select onChange={(e) => { if (e.target.value) { exportAs(e.target.value as "geojson" | "kml" | "shp"); e.target.value = ""; } }} disabled={filtered.length === 0}
          className="btn-primary !py-2 text-[13px] disabled:opacity-40" defaultValue="">
          <option value="" disabled>{t.export}</option>
          <option value="geojson">GeoJSON</option>
          <option value="kml">KML</option>
          <option value="shp">Shapefile (.zip)</option>
        </select>
        <button onClick={() => navigator.clipboard.writeText(publicLink)} className="btn-outline !py-2 text-[12px]" title={publicLink}>
          {t.shareReportLink} ⧉
        </button>
      </div>

      <div className="grid flex-1 min-h-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="card min-h-[300px] !p-2">
          {loading ? <p className="text-muted font-light">{t.loading}</p> : (
            <SubmissionsMap rows={mapRows} rtl={locale === "ar"} labels={{ status: { submitted: t.pending, approved: t.verified, rejected: t.rejected }, details: t.viewDetails }}
              onSelect={(id) => setSelected(rows.find((r) => r.id === id) ?? null)} />
          )}
        </div>
        <div className="card min-h-0 overflow-auto !p-0">
          {selected ? (
            <div className="p-5">
              <button onClick={() => setSelected(null)} className="btn-ghost mb-3 !bg-white !py-1.5 text-[12px]">← {t.publicReports}</button>
              <h2 className="text-[20px] font-bold">{catLabel[selected.category]}</h2>
              <p className="card-sub">{new Date(selected.created_at).toLocaleString()} · {statusLabel[selected.status]}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{selected.description}</p>
              {(selected.reporter_name || selected.reporter_phone) && (
                <p className="mt-2 text-sm text-muted">{selected.reporter_name} <span dir="ltr">{selected.reporter_phone}</span></p>
              )}
              <p className="mt-1 text-xs text-muted" dir="ltr">{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}{selected.location_accuracy_m ? ` (±${Math.round(selected.location_accuracy_m)}m)` : ""}</p>
              {photoUrl && <img src={photoUrl} alt={t.photo} className="mt-3 max-h-64 rounded-2xl" />}
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.reviewNote} rows={2} className="input mt-3" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => setStatus("verified")} className="rounded-xl btn-primary !py-2 text-[13px]">{t.verify}</button>
                <button onClick={() => setStatus("resolved")} className="rounded-xl btn-accent !py-2 text-[13px]">{t.resolve}</button>
                <button onClick={() => setStatus("rejected")} className="rounded-xl btn-danger !py-2 text-[13px]">{t.reject}</button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {filtered.map((r) => (
                <li key={r.id} onClick={() => setSelected(r)} className="cursor-pointer px-4 py-3 transition hover:bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{catLabel[r.category]}</span>
                    <span className="card-sub">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p className="line-clamp-2 text-[13px] font-light text-muted">{r.description}</p>
                </li>
              ))}
              {filtered.length === 0 && !loading && <li className="p-8 text-center text-muted">{t.noDataYet}</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
