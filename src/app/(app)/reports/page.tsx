"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
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

  const publicLink = typeof window !== "undefined" ? `${window.location.origin}/report` : "/report";

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="me-auto text-xl font-bold">{t.publicReports}</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "all")} className="rounded-lg border px-2 py-1.5 text-sm">
          <option value="all">{t.mapAll}</option>
          {(Object.keys(statusLabel) as ReportStatus[]).map((k) => <option key={k} value={k}>{statusLabel[k]}</option>)}
        </select>
        <span className="text-sm text-gray-500">{filtered.length}</span>
        <button onClick={() => navigator.clipboard.writeText(publicLink)} className="rounded-lg border px-3 py-1.5 text-xs" title={publicLink}>
          {t.shareReportLink} ⧉
        </button>
      </div>

      <div className="grid flex-1 min-h-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-h-[300px]">
          {loading ? <p className="text-gray-500">{t.loading}</p> : (
            <SubmissionsMap rows={mapRows} rtl={locale === "ar"} labels={{ status: { submitted: t.pending, approved: t.verified, rejected: t.rejected }, details: t.viewDetails }}
              onSelect={(id) => setSelected(rows.find((r) => r.id === id) ?? null)} />
          )}
        </div>
        <div className="min-h-0 overflow-auto rounded-xl border">
          {selected ? (
            <div className="p-4">
              <button onClick={() => setSelected(null)} className="mb-2 text-sm text-gray-500">← {t.publicReports}</button>
              <h2 className="text-lg font-semibold">{catLabel[selected.category]}</h2>
              <p className="text-xs text-gray-500">{new Date(selected.created_at).toLocaleString()} · {statusLabel[selected.status]}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{selected.description}</p>
              {(selected.reporter_name || selected.reporter_phone) && (
                <p className="mt-2 text-sm text-gray-600">{selected.reporter_name} <span dir="ltr">{selected.reporter_phone}</span></p>
              )}
              <p className="mt-1 text-xs text-gray-500" dir="ltr">{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}{selected.location_accuracy_m ? ` (±${Math.round(selected.location_accuracy_m)}m)` : ""}</p>
              {photoUrl && <img src={photoUrl} alt={t.photo} className="mt-3 max-h-64 rounded-lg" />}
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.reviewNote} rows={2} className="mt-3 w-full rounded-lg border px-3 py-2 text-sm" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => setStatus("verified")} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white">{t.verify}</button>
                <button onClick={() => setStatus("resolved")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white">{t.resolve}</button>
                <button onClick={() => setStatus("rejected")} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white">{t.reject}</button>
              </div>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => (
                <li key={r.id} onClick={() => setSelected(r)} className="cursor-pointer p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{catLabel[r.category]}</span>
                    <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-gray-600">{r.description}</p>
                </li>
              ))}
              {filtered.length === 0 && !loading && <li className="p-6 text-center text-gray-500">—</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
