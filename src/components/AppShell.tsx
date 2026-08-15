"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { switchLocale, useI18n } from "@/components/I18nProvider";
import { branding } from "@/lib/branding";

export type Profile = {
  id: string;
  full_name: string;
  role: "admin" | "supervisor" | "collector";
  is_active: boolean;
};

export default function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAdmin = profile.role === "admin";

  const nav = [
    { href: "/", label: t.dashboard, show: true },
    { href: "/forms", label: t.forms, show: true },
    { href: "/submissions", label: t.submissions, show: true },
    { href: "/map", label: t.map, show: true },
    { href: "/projects", label: t.projects, show: isAdmin },
    { href: "/users", label: t.users, show: isAdmin },
  ].filter((n) => n.show);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLinks = (
    <nav className="flex flex-col gap-1 p-3 md:flex-row md:p-0">
      {nav.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            pathname === n.href
              ? "bg-white/15 text-white"
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }`}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <header className="bg-brand-dark text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 hover:bg-white/10 md:hidden"
              onClick={() => setOpen(!open)}
              aria-label="menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <Image src={branding.logo} alt="logo" width={34} height={34} />
            <span className="text-sm font-bold sm:text-base">
              {locale === "ar" ? branding.shortAr : branding.shortEn}
            </span>
          </div>
          <div className="hidden md:block">{navLinks}</div>
          <div className="flex items-center gap-2 text-sm">
            <button className="rounded-lg px-2 py-1 text-white/80 hover:bg-white/10" onClick={() => switchLocale(locale)}>
              {t.language}
            </button>
            <span className="hidden text-white/80 sm:inline">
              {profile.full_name} · {t[profile.role]}
            </span>
            <button className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20" onClick={logout}>
              {t.logout}
            </button>
          </div>
        </div>
        {open && <div className="border-t border-white/10 md:hidden">{navLinks}</div>}
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
    </div>
  );
}
