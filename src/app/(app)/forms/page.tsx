"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import type { FormRow } from "@/lib/types";

export default function FormsPage() {
  const { t } = useI18n();
  const supabase = createClient();
  const [forms, setForms] = useState<FormRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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
      draft: "bg-wheat-100 text-charcoal-700",
      published: "status-approved",
      closed: "bg-red-100 text-umber-500",
    };
    return <span className={`badge ${map[s]}`}>{t[s === "closed" ? "closed" : s]}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-dark">{t.forms}</h1>
        {isAdmin && (
          <Link href="/forms/builder/new" className="btn-primary">
            + {t.newForm}
          </Link>
        )}
      </div>
      {loading ? (
        <p className="text-gray-500">{t.loading}</p>
      ) : forms.length === 0 ? (
        <p className="card text-gray-500">{t.noData}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <div key={f.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold">{f.title}</h2>
                {statusBadge(f.status)}
              </div>
              {f.description && <p className="text-sm text-gray-600">{f.description}</p>}
              <p className="text-xs text-gray-400">
                {f.schema?.fields?.length ?? 0} {t.fieldLabel}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                {f.status === "published" && (
                  <Link href={`/forms/${f.id}/fill`} className="btn-primary flex-1">
                    {t.fill}
                  </Link>
                )}
                {isAdmin && (
                  <>
                    <Link href={`/forms/builder/${f.id}`} className="btn-outline">
                      {t.edit}
                    </Link>
                    {f.status === "published" ? (
                      <button className="btn-outline" onClick={() => setStatus(f.id, "draft")}>
                        {t.unpublish}
                      </button>
                    ) : (
                      <button className="btn-outline" onClick={() => setStatus(f.id, "published")}>
                        {t.publish}
                      </button>
                    )}
                    <button className="btn-danger" onClick={() => remove(f.id)}>
                      {t.delete}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
