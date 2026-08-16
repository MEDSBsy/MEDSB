import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getDict, type Locale } from "@/lib/i18n";
import BarChart from "@/components/dashboard/BarChart";
import MiniMap from "@/components/dashboard/MiniMap";
import { Icon } from "@/components/Icons";
import type { SubmissionMapRow } from "@/lib/types";

type Recent = { id: string; submitted_at: string; status: string; respondent_name: string | null; forms: { title: string } | null };

export default async function Dashboard() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value === "en" ? "en" : "ar") as Locale;
  const t = getDict(locale);
  const rtl = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user!.id).single();
  const isAdmin = profile?.role === "admin";

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400e3).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86400e3).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400e3).toISOString();

  const [
    { count: publishedCount }, { count: formsCount }, { count: subsCount }, { count: subsToday }, { count: subsWeek }, { count: subsPrevWeek },
    { count: usersCount }, { data: subs7 }, { data: mapRows }, { data: recent },
  ] = await Promise.all([
    supabase.from("forms").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("forms").select("id", { count: "exact", head: true }),
    supabase.from("submissions").select("id", { count: "exact", head: true }),
    supabase.from("submissions").select("id", { count: "exact", head: true }).gte("submitted_at", dayAgo),
    supabase.from("submissions").select("id", { count: "exact", head: true }).gte("submitted_at", weekAgo),
    supabase.from("submissions").select("id", { count: "exact", head: true }).gte("submitted_at", twoWeeksAgo).lt("submitted_at", weekAgo),
    isAdmin ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true) : Promise.resolve({ count: null }),
    supabase.from("submissions").select("submitted_at").gte("submitted_at", weekAgo),
    supabase.from("submissions_map").select("id, form_id, form_title, project_id, project_name, status, submitted_at, submitted_by_name, location_accuracy_m, data, lat, lng").order("submitted_at", { ascending: false }).limit(300),
    supabase.from("submissions").select("id, submitted_at, status, respondent_name, forms(title)").order("submitted_at", { ascending: false }).limit(6),
  ]);

  const dayNames = rtl ? ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = [...Array(7)].map((_, i) => { const d = new Date(now); d.setDate(now.getDate() - (6 - i)); return d; });
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const series = days.map((d) => ({ label: dayNames[d.getDay()], a: (subs7 ?? []).filter((s) => key(new Date(s.submitted_at)) === key(d)).length, b: 0 }));
  const delta = (subsPrevWeek ?? 0) === 0 ? null : Math.round((((subsWeek ?? 0) - (subsPrevWeek ?? 0)) / (subsPrevWeek ?? 1)) * 100);

  const statusCls: Record<string, string> = { submitted: "status-pending", approved: "status-approved", rejected: "status-rejected" };
  const statusTxt: Record<string, string> = { submitted: t.submitted, approved: t.approved, rejected: t.rejected };
  const firstName = (profile?.full_name || "").split(" ")[0];
  const dateStr = now.toLocaleDateString(rtl ? "ar-SY" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">{t.welcome}، <span className="light">{firstName}</span></h1>
        <div className="flex items-center gap-2">
          <span className="btn-outline cursor-default text-[13px] font-medium">{dateStr}</span>
          <Link href="/forms/builder/new" className="btn-primary"><Icon name="plus" size={16} /> {t.newForm}</Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* Column 1 */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-start justify-between">
              <div><div className="card-title">{t.responsesToday}</div><div className="card-sub">{t.responsesTodaySub}</div></div>
              <Link href="/submissions" className="icon-btn"><Icon name="arrow" size={16} /></Link>
            </div>
            <div className="card-brand mt-4">
              <div className="flex items-center justify-between text-[12px] font-light text-white/70">
                <span>{t.submissions}</span><Icon name="inbox" size={18} className="text-white/60" />
              </div>
              <div className="mt-6 text-[40px] font-black leading-none">{subsToday ?? 0}</div>
              <div className="mt-5 flex items-center justify-between text-[11px] font-light text-white/70">
                <span>{t.totalResponses}: {subsCount ?? 0}</span><span>{t.todayWord}</span>
              </div>
            </div>
          </div>
          <div className="card flex items-center justify-between">
            <div><div className="card-sub">{t.weekWord} · {t.submissions}</div><div className="mt-1 text-[26px] font-black leading-none">+{subsWeek ?? 0}</div></div>
            {delta !== null && <span className="badge-up">{delta >= 0 ? "+" : ""}{delta}%</span>}
          </div>
          <div className="card flex items-center justify-between">
            <div><div className="card-sub">{t.publishedSurveys}</div><div className="mt-1 text-[26px] font-black leading-none">{publishedCount ?? 0} <span className="kpi-dim text-[15px]">/ {formsCount ?? 0}</span></div></div>
            <Link href="/forms" className="icon-btn"><Icon name="arrow" size={16} /></Link>
          </div>
        </div>

        {/* Column 2 */}
        <div className="space-y-4">
          <div className="card">
            <div className="mb-8 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="icon-btn"><Icon name="grid" size={16} /></span>
                <div><div className="card-title">{t.weeklyActivity}</div><div className="card-sub">{t.weeklyActivitySub}</div></div>
              </div>
              <div className="pill hidden gap-1 p-1 sm:flex"><span className="nav-pill nav-pill-active text-[12px]">{t.weekWord}</span></div>
            </div>
            <BarChart data={series} unit="" />
          </div>
          <div className="card">
            <div className="mb-3 flex items-start justify-between">
              <div><div className="card-title">{t.latestResponses}</div><div className="card-sub">{t.latestResponsesSub}</div></div>
              <Link href="/submissions" className="icon-btn"><Icon name="arrow" size={16} /></Link>
            </div>
            {(recent ?? []).length > 0 ? (
              <table className="tbl">
                <thead><tr><th>{t.colSurvey}</th><th className="hidden sm:table-cell">{t.colRespondent}</th><th>{t.colTime}</th><th>{t.colStatus}</th></tr></thead>
                <tbody>
                  {(recent as unknown as Recent[]).map((r) => (
                    <tr key={r.id}>
                      <td className="max-w-[240px] truncate font-medium">{r.forms?.title ?? "—"}</td>
                      <td className="hidden text-muted sm:table-cell">{r.respondent_name || t.anonymous}</td>
                      <td className="text-muted">{new Date(r.submitted_at).toLocaleString(rtl ? "ar-SY" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td><span className={statusCls[r.status]}>{statusTxt[r.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">{t.noDataYet}</div>
            )}
          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-4">
          <div className="card flex h-full flex-col">
            <div className="flex items-start justify-between">
              <div><div className="card-title">{t.liveMap}</div><div className="card-sub">{t.liveMapSub}</div></div>
              <Link href="/map" className="icon-btn"><Icon name="arrow" size={16} /></Link>
            </div>
            <div className="mt-4 flex-1"><MiniMap rows={(mapRows as SubmissionMapRow[]) ?? []} rtl={rtl} /></div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[13px] font-medium">{(mapRows ?? []).length} <span className="text-muted font-light">{t.totalPoints}</span></span>
              <Link href="/map" className="btn-primary text-[13px]">{t.openMap} <Icon name="arrow" size={14} /></Link>
            </div>
          </div>
          {isAdmin && (
            <div className="card flex items-center justify-between">
              <div><div className="card-sub">{t.team}</div><div className="mt-1 text-[26px] font-black leading-none">{usersCount ?? 0}</div><div className="card-sub">{t.teamSub}</div></div>
              <Link href="/users" className="icon-btn"><Icon name="users" size={16} /></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
