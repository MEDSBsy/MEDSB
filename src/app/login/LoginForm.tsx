"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { switchLocale, useI18n } from "@/components/I18nProvider";
import { branding } from "@/lib/branding";

export default function LoginForm() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) { setMsg(error.message); }
      else {
        // Accounts are auto-confirmed server-side; sign in immediately.
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) { setMsg(t.signupSuccess); setMode("login"); }
        else { router.push("/"); router.refresh(); }
      }
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen p-2 sm:p-4 lg:p-6">
      <div className="panel mx-auto grid min-h-[calc(100vh-1rem)] max-w-[1200px] overflow-hidden sm:min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.1fr_1fr]">
        {/* Brand side */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-brand p-10 text-white lg:flex" style={{ borderStartStartRadius: 28, borderEndStartRadius: 28 }}>
          <div className="pill inline-flex w-fit items-center gap-2 !bg-white/10 px-3 py-2">
            <Image src={branding.logo} alt="" width={28} height={28} className="rounded-lg" />
            <span className="text-[14px] font-bold">{locale === "ar" ? branding.shortAr : branding.shortEn}</span>
          </div>
          <div>
            <h2 className="text-[44px] font-black leading-[1.15] tracking-tight">
              {locale === "ar" ? <>منصة واحدة<br /><span className="font-light text-white/70">للميدان والخريطة والقرار.</span></> : <>One platform<br /><span className="font-light text-white/70">for field, map and decision.</span></>}
            </h2>
            <p className="mt-6 max-w-md text-[15px] font-light leading-relaxed text-white/70">
              {locale === "ar" ? "جمع البيانات الميدانية، البلاغات المجتمعية، والخرائط الحيّة — في نظام سيادي واحد يعمل حتى دون اتصال." : "Field data collection, community reports and live maps — one sovereign system that works even offline."}
            </p>
          </div>
          <div className="flex items-center gap-6 text-[12px] font-light text-white/60">
            <span>PostGIS · QGIS</span><span>PWA · Offline</span><span>MapLibre</span>
          </div>
          <svg className="pointer-events-none absolute -bottom-24 -end-24 h-[420px] w-[420px] opacity-[0.08]" viewBox="0 0 200 200" fill="none" stroke="#fff" strokeWidth="1">
            {[...Array(8)].map((_, i) => <circle key={i} cx="100" cy="100" r={20 + i * 12} />)}
          </svg>
        </section>

        {/* Form side */}
        <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2"><Image src={branding.logo} alt="" width={32} height={32} className="rounded-lg" /><span className="font-bold">{locale === "ar" ? branding.shortAr : branding.shortEn}</span></div>
            <button className="pill-icon" onClick={() => switchLocale(locale)}><span className="text-[11px] font-bold">{locale === "ar" ? "EN" : "ع"}</span></button>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <h1 className="text-[30px] font-bold text-ink">
              {mode === "login" ? t.login : t.signup}
            </h1>
            <p className="mb-8 mt-1 text-[14px] font-light text-muted">{locale === "ar" ? branding.nameAr : branding.nameEn}</p>
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="label">{t.fullName}</label>
                  <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="label">{t.email}</label>
                <input className="input" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">{t.password}</label>
                <input className="input" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              {msg && <p className="rounded-xl bg-[#f0e2e4] px-3 py-2 text-[13px] text-danger-dark">{msg}</p>}
              <button className="btn-primary w-full !py-3" disabled={busy}>
                {busy ? t.loading : mode === "login" ? t.login : t.signup}
              </button>
            </form>
            <div className="mt-6 flex items-center justify-between text-[13px]">
              <button className="font-medium text-brand" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                {mode === "login" ? `${t.noAccount} ${t.signup}` : `${t.haveAccount} ${t.login}`}
              </button>
              <button className="hidden text-muted lg:inline" onClick={() => switchLocale(locale)}>{t.language}</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
