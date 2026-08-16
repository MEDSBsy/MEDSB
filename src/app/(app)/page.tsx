import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getDict, type Locale } from "@/lib/i18n";
import BarChart from "@/components/dashboard/BarChart";
import MiniMap from "@/components/dashboard/MiniMap";
import { Icon } from "@/components/Icons";
import type { SubmissionMapRow, PublicReportRow, ReportCategory } from "@/lib/types";

export default async function Dashboard() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value === "en" ? "en" : "ar") as Locale;
  const t = getDict(locale);
  const rtl = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user!.id).single();
  const isStaff = profile?.role !== "collector";
  const isAdmin = profile?.role === "admin";

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400e3).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86400e3).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400e3).toISOString();

  const [
    { count: formsCount }, { count: subsCount }, { count: subsWeek }, { count: subsPrevWeek },
    { count: repToday }, { count: repPending }, { count: usersCount },
    { data: subs7 }, { data: reps7 }, { data: mapRows }, { data: recentReps },
  ] = await Promise.all([
    supabase.from("forms").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("submissions").select("id", { count: "exact", head: true }),
    supabase.from("submissions").select("id", { count: "exact", head: true }).gte("submitted_at", weekAgo),
    supabase.from("submissions").select("id", { count: "exact", head: true }).gte("submitted_at", twoWeeksAgo).lt("submitted_at", weekAgo),
    isStaff ? supabase.from("public_reports").select("id", { count: "exact", head: true }).gte("created_at", dayAgo) : Promise.resolve({ count: 0 }),
    isStaff ? supabase.from("public_reports").select("id", { count: "exact", head: true }).eq("status", "pending") : Promise.resolve({ count: 0 }),
    isAdmin ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true) : Promise.resolve({ count: null }),
    supabase.from("submissions").select("submitted_at").gte("submitted_at", weekAgo),
    isStaff ? supabase.from("public_reports").select("created_at").gte("created_at", weekAgo) : Promise.resolve({ data: [] as { created_at: string }[] }),
    supabase.from("submissions_map").select("id, form_id, form_title, project_id, project_name, status, submitted_at, submitted_by_name, location_accuracy_m, data, lat, lng").order("submitted_at", { ascending: false }).limit(300),
    isStaff ? supabase.from("public_reports_map").select("*").order("created_at", { ascending: false }).limit(6) : Promise.resolve({ data: [] as PublicReportRow[] }),
  ]);

  // Build 7-day series
  const dayNames = rtl ? ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = [...Array(7)].map((_, i) => { const d = new Date(now); d.setDate(now.getDate() - (6 - i)); return d; });
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const series = days.map((d) => ({
    label: dayNames[d.getDay()],
    a: (subs7 ?? []).filter((s) => key(new Date(s.submitted_at)) === key(d)).length,
    b: (reps7 ?? []).filter((r) => key(new Date(r.created_at)) === key(d)).length,
  }));
  const delta = (subsPrevWeek ?? 0) === 0 ? null : Math.round((((subsWeek ?? 0) - (subsPrevWeek ?? 0)) / (subsPrevWeek ?? 1)) * 100);

  const catLabel: Record<ReportCategory, string> = { flood: t.catFlood, fire: t.catFire, earthquake: t.catEarthquake, building: t.catBuilding, road: t.catRoad, medical: t.catMedical, other: t.catOther };
  const statusCls: Record<string, string> = { pending: "status-pending", verified: "status-approved", resolved: "status-approved", rejected: "status-rejected" };
  const statusTxt: Record<string, string> = { pending: t.pending, verified: t.verified, resolved: t.resolved, rejected: t.rejected };
  const firstName = (profile?.full_name || "").split(" ")[0];
  const dateStr = now.toLocaleDateString(rtl ? "ar-SY" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-5">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">
          {t.welcome}، <span className="light">{firstName}</span>
        </h1>
        <div className="flex items-center gap-2">
          <span className="btn-outline cursor-default text-[13px] font-medium">{dateStr}</span>
          {isStaff && <Link href="/forms" className="btn-outline"><Icon name="plus" size={16} /> {t.newForm}</Link>}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* Column 1 */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-start justify-between">
              <div><div className="card-title">{isStaff ? t.todayReports : t.submissions}</div><div className="card-sub">{isStaff ? t.todayReportsSub : t.weekWord}</div></div>
              <Link href={isStaff ? "/reports" : "/submissions"} className="icon-btn"><Icon name="arrow" size={16} /></Link>
            </div>
            <div className="card-brand mt-4">
              <div className="flex items-center justify-between text-[12px] font-light text-white/70">
                <span>{isStaff ? t.publicReports : t.submissions}</span>
                <Icon name="megaphone" size={18} className="text-white/60" />
              </div>
              <div className="mt-6 text-[40px] font-black leading-none">{isStaff ? repToday ?? 0 : subsWeek ?? 0}</div>
              <div className="mt-5 flex items-center justify-between text-[11px] font-light text-white/70">
                <span>{isStaff ? `${repPending ?? 0} ${t.pendingReview}` : `${subsCount ?? 0} ${t.submissions}`}</span>
                <span>{t.todayWord}</span>
              </div>
            </div>
          </div>
          <div className="card flex items-center justify-between">
            <div>
              <div className="card-sub">{t.weekWord} · {t.submissions}</div>
              <div className="mt-1 text-[26px] font-black leading-none">+{subsWeek ?? 0}</div>
            </div>
            {delta !== null && <span className="badge-up">{delta >= 0 ? "+" : ""}{delta}%</span>}
          </div>
          <div className="card flex items-center justify-between">
            <div>
              <div className="card-sub">{t.activeForms}</div>
              <div className="mt-1 text-[26px] font-black leading-none">{formsCount ?? 0}</div>
            </div>
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
              <div className="pill hidden gap-1 p-1 sm:flex">
                <span className="nav-pill nav-pill-active text-[12px]">{t.weekWord}</span>
              </div>
            </div>
            <BarChart data={series} unit="" />
          </div>
          <div className="card">
            <div className="mb-3 flex items-start justify-between">
              <div><div className="card-title">{isStaff ? t.recentReports : t.submissions}</div><div className="card-sub">{isStaff ? t.recentReportsSub : t.weekWord}</div></div>
              <Link href={isStaff ? "/reports" : "/submissions"} className="icon-btn"><Icon name="arrow" size={16} /></Link>
            </div>
            {isStaff && (recentReps ?? []).length > 0 ? (
              <table className="tbl">
                <thead><tr><th>{t.colType}</th><th className="hidden sm:table-cell">{t.colDesc}</th><th>{t.colTime}</th><th>{t.colStatus}</th></tr></thead>
                <tbody>
                  {(recentReps as PublicReportRow[]).map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{catLabel[r.category]}</td>
                      <td className="hidden max-w-[260px] truncate text-muted sm:table-cell">{r.description}</td>
                      <td className="text-muted">{new Date(r.created_at).toLocaleTimeString(rtl ? "ar-SY" : "en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td><span className={statusCls[r.status]}><span className="dot me-1.5 bg-current opacity-70" />{statusTxt[r.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-6 text-center text-[13px] text-muted">{t.noDataYet}</p>
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
            <div className="mt-4 flex-1">
              <MiniMap rows={(mapRows as SubmissionMapRow[]) ?? []} rtl={rtl} />
            </div>
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
