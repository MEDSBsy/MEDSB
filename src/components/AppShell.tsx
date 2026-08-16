"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { switchLocale, useI18n } from "@/components/I18nProvider";
import { branding } from "@/lib/branding";
import NotificationBell from "@/components/NotificationBell";
import { Icon, type IconName } from "@/components/Icons";

export type Profile = {
  id: string;
  full_name: string;
  role: "admin" | "user";
  is_active: boolean;
};

export default function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAdmin = profile.role === "admin";

  const nav = [
    { href: "/", label: t.dashboard, icon: "grid", show: true },
    { href: "/map", label: t.map, icon: "map", show: true },
    { href: "/reports", label: t.publicReports, icon: "alert", show: isAdmin },
    { href: "/forms", label: t.forms, icon: "form", show: true },
    { href: "/submissions", label: t.submissions, icon: "inbox", show: true },
    { href: "/users", label: t.users, icon: "users", show: isAdmin },
  ].filter((n) => n.show) as { href: string; label: string; icon: IconName; show: boolean }[];

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (profile.full_name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("");

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6">
      <div className="panel mx-auto flex min-h-[calc(100vh-1rem)] max-w-[1440px] flex-col sm:min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-3rem)]">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 pt-4 sm:px-6 lg:px-8">
          <button className="pill-icon lg:hidden" onClick={() => setOpen(!open)} aria-label="menu">
            <Icon name="menu" />
          </button>
          <div className="pill flex items-center gap-2 px-3 py-2">
            <Image src={branding.logo} alt="" width={30} height={30} className="rounded-xl" />
            <span className="text-[15px] font-bold text-ink">{locale === "ar" ? branding.shortAr : branding.shortEn}</span>
          </div>

          <nav className="pill mx-auto hidden items-center gap-1 p-1 lg:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={`nav-pill ${active(n.href) ? "nav-pill-active" : ""}`}>
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2 lg:ms-0">
            <button className="pill-icon" onClick={() => switchLocale(locale)} title={t.language}>
              <span className="text-[11px] font-bold">{locale === "ar" ? "EN" : "ع"}</span>
            </button>
            <NotificationBell variant="pill" />
            <div className="pill hidden items-center gap-2 py-1 pe-3 ps-1 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white">{initials}</span>
              <div className="leading-tight">
                <div className="text-[13px] font-bold text-ink">{profile.full_name}</div>
                <div className="text-[11px] font-light text-muted">{t[profile.role]}</div>
              </div>
              <button onClick={logout} className="ms-1 text-muted hover:text-danger" title={t.logout}><Icon name="logout" size={16} /></button>
            </div>
          </div>
        </header>

        {open && (
          <nav className="mx-4 mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-surface p-2 lg:hidden">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`nav-pill flex items-center gap-2 ${active(n.href) ? "nav-pill-active" : ""}`}>
                <Icon name={n.icon} size={16} /> {n.label}
              </Link>
            ))}
            <button onClick={logout} className="nav-pill flex items-center gap-2 text-danger"><Icon name="logout" size={16} /> {t.logout}</button>
          </nav>
        )}

        {/* Body: icon rail + content */}
        <div className="flex flex-1 gap-4 px-4 pb-4 pt-5 sm:px-6 lg:px-8 lg:pb-8">
          <aside className="hidden lg:flex flex-col gap-3">
            <div className="rail">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} title={n.label} className={`rail-btn ${active(n.href) ? "rail-btn-active" : ""}`}>
                  <Icon name={n.icon} size={18} />
                </Link>
              ))}
            </div>
            <div className="rail mt-auto">
              <Link href="/report" target="_blank" title={t.publicReport} className="rail-btn"><Icon name="megaphone" size={18} /></Link>
              <button onClick={logout} title={t.logout} className="rail-btn hover:text-danger"><Icon name="logout" size={18} /></button>
            </div>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
