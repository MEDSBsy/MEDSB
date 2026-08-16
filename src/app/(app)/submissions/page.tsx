"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import type { FormRow, SubmissionRow } from "@/lib/types";

type Sub = SubmissionRow & { profiles: { full_name: string } | null };

export default function SubmissionsPage() {
  return <Suspense fallback={null}><SubmissionsInner /></Suspense>;
}

function SubmissionsInner() {
  const { t } = useI18n();
  const supabase = createClient();
  const formFilter = useSearchParams().get("form");
  const [subs, setSubs] = useState<Sub[]>([]);
  const [forms, setForms] = useState<Record<string, FormRow>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user!.id)
      .single();
    setIsAdmin(profile?.role === "admin");
    const [{ data: s }, { data: f }] = await Promise.all([
      supabase
        .from("submissions")
        .select("*, profiles!submissions_submitted_by_fkey(full_name)")
        .order("submitted_at", { ascending: false }),
      supabase.from("forms").select("*"),
    ]);
    setSubs(((s as Sub[]) ?? []).filter((x) => !formFilter || x.form_id === formFilter));
    setForms(Object.fromEntries(((f as FormRow[]) ?? []).map((x) => [x.id, x])));
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function review(id: string, status: "approved" | "rejected") {
    const { data: userData } = await supabase.auth.getUser();
    await supabase
      .from("submissions")
      .update({ status, reviewed_by: userData.user!.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    load();
  }

  function exportCsv() {
    if (subs.length === 0) return;
    const keys = new Set<string>();
    subs.forEach((s) => Object.keys(s.data ?? {}).forEach((k) => keys.add(k)));
    const cols = ["id", "form", "status", "submitted_by", "submitted_at", ...keys];
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = subs.map((s) =>
      [
        s.id,
        forms[s.form_id]?.title ?? s.form_id,
        s.status,
        s.profiles?.full_name ?? s.respondent_name ?? "",
        s.submitted_at,
        ...[...keys].map((k) => {
          const v = (s.data ?? {})[k];
          return typeof v === "object" ? JSON.stringify(v) : v;
        }),
      ].map(esc).join(",")
    );
    const csv = "﻿" + [cols.map(esc).join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "submissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const badge = (s: Sub["status"]) => {
    const map = {
      submitted: "status-pending",
      approved: "status-approved",
      rejected: "status-rejected",
    };
    return <span className={map[s]}>{t[s]}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{t.submissions}</h1>
        {subs.length > 0 && (
          <button className="btn-outline" onClick={exportCsv}>
            ⬇ {t.exportCsv}
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-muted font-light">{t.loading}</p>
      ) : subs.length === 0 ? (
        <div className="empty">{t.noData}</div>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <div key={s.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{forms[s.form_id]?.title ?? "—"}</p>
                  <p className="text-xs text-muted">
                    {t.respondent}: {s.profiles?.full_name ?? s.respondent_name ?? t.anonymous}{s.respondent_phone ? ` (${s.respondent_phone})` : ""} · {t.submittedAt}:{" "}
                    {new Date(s.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {badge(s.status)}
                  <button
                    className="btn-outline !px-2 !py-1"
                    onClick={() => setOpenId(openId === s.id ? null : s.id)}
                  >
                    {t.details}
                  </button>
                  {s.status === "submitted" && (
                    <>
                      <button className="btn-primary !px-2 !py-1" onClick={() => review(s.id, "approved")}>
                        ✓ {t.approve}
                      </button>
                      <button className="btn-danger !px-2 !py-1" onClick={() => review(s.id, "rejected")}>
                        ✕ {t.reject}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {openId === s.id && (
                <div className="mt-3 overflow-x-auto rounded-xl bg-white p-3">
                  <table className="w-full text-sm">
                    <tbody>
                      {(forms[s.form_id]?.schema.fields ?? []).map((f) => {
                        const v = (s.data ?? {})[f.key];
                        return (
                          <tr key={f.key} className="border-b border-[var(--line)] last:border-0">
                            <td className="py-1.5 pe-4 font-medium text-muted">{f.label}</td>
                            <td className="py-1.5">
                              {typeof v === "object" && v !== null
                                ? JSON.stringify(v)
                                : String(v ?? "—")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
