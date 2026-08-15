import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getDict, type Locale } from "@/lib/i18n";

export default async function Dashboard() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value === "en" ? "en" : "ar") as Locale;
  const t = getDict(locale);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user!.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const [{ count: formsCount }, { count: subsCount }] = await Promise.all([
    supabase.from("forms").select("id", { count: "exact", head: true }),
    supabase.from("submissions").select("id", { count: "exact", head: true }),
  ]);
  let usersCount: number | null = null;
  if (isAdmin) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    usersCount = count;
  }

  const stats = [
    { label: t.totalForms, value: formsCount ?? 0, href: "/forms" },
    { label: t.totalSubmissions, value: subsCount ?? 0, href: "/submissions" },
    ...(isAdmin ? [{ label: t.totalUsers, value: usersCount ?? 0, href: "/users" }] : []),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-dark">
        {t.welcome}، {profile?.full_name || ""} 👋
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.href + s.label} href={s.href} className="card transition hover:shadow-md">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-2 text-3xl font-bold text-brand">{s.value}</p>
          </Link>
        ))}
      </div>
      {!isAdmin && <p className="text-sm text-gray-600">{t.myFormsHint} — <Link className="text-brand underline" href="/forms">{t.forms}</Link></p>}
    </div>
  );
}
