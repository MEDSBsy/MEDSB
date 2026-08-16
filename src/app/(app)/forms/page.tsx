"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import type { FormRow } from "@/lib/types";
import ShareDialog from "@/components/ShareDialog";
import { Icon } from "@/components/Icons";

export default function FormsPage() {
  const { t } = useI18n();
  const supabase = createClient();
  const [forms, setForms] = useState<FormRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<FormRow | null>(null);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user!.id)
      .single();
    setIsAdmin(profile?.role === "admin");
    const { data } = await supabase
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false });
    setForms((data as FormRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, status: string) {
    await supabase.from("forms").update({ status }).eq("id", id);
    load();
  }
  async function remove(id: string) {
    if (!confirm(t.confirmDelete)) return;
    await supabase.from("forms").delete().eq("id", id);
    load();
  }

  const statusBadge = (s: FormRow["status"]) => {
    const map = {
      draft: "badge bg-white text-ink-2",
      published: "status-approved",
      closed: "status-rejected",
    };
    return <span className={map[s]}>{t[s === "closed" ? "closed" : s]}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{isAdmin ? t.allSurveys : t.mySurveys} <span className="light">{forms.length}</span></h1>
        <Link href="/forms/builder/new" className="btn-primary"><Icon name="plus" size={16} /> {t.newForm}</Link>
      </div>
      {loading ? (
        <p className="text-muted font-light">{t.loading}</p>
      ) : forms.length === 0 ? (
        <div className="empty">{t.noData}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <div key={f.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="section-title">{f.title}</h2>
                {statusBadge(f.status)}
              </div>
              {f.description && <p className="text-sm text-muted">{f.description}</p>}
              <p className="text-[12px] font-light text-muted">
                {f.schema?.fields?.length ?? 0} {t.fieldLabel} · <b className="font-bold text-ink">{f.response_count ?? 0}</b> {t.responses}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <button onClick={() => setShare(f)} className="btn-primary flex-1"><Icon name="external" size={14} /> {t.share}</button>
                <Link href={`/submissions?form=${f.id}`} className="btn-outline">{t.submissions}</Link>
                <Link href={`/forms/builder/${f.id}`} className="btn-outline">{t.edit}</Link>
                {f.status === "published" ? (
                  <button className="btn-outline" onClick={() => setStatus(f.id, "draft")}>{t.unpublish}</button>
                ) : (
                  <button className="btn-accent" onClick={() => setStatus(f.id, "published")}>{t.publish}</button>
                )}
                <button className="btn-danger" onClick={() => remove(f.id)}>{t.delete}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {share && <ShareDialog form={share} onClose={() => setShare(null)} />}
    </div>
  );
}
