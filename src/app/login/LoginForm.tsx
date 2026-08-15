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
      if (error) setMsg(error.message);
      else {
        setMsg(t.signupSuccess);
        setMode("login");
      }
    }
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-light to-surface p-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image src={branding.logo} alt="logo" width={64} height={64} />
          <h1 className="text-xl font-bold text-brand-dark">
            {locale === "ar" ? branding.nameAr : branding.nameEn}
          </h1>
        </div>
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
          {msg && <p className="text-sm text-red-700">{msg}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? t.loading : mode === "login" ? t.login : t.signup}
          </button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            className="text-brand underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? `${t.noAccount} ${t.signup}` : `${t.haveAccount} ${t.login}`}
          </button>
          <button className="text-gray-500 underline" onClick={() => switchLocale(locale)}>
            {t.language}
          </button>
        </div>
      </div>
    </main>
  );
}
