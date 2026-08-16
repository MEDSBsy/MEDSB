"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";

type Notif = { id: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string };

export default function NotificationBell({ variant = "dark" }: { variant?: "dark" | "pill" }) {
  const { t } = useI18n();
  const supabase = createClient();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.is_read).length;

  async function load() {
    const { data } = await supabase.from("notifications").select("id,title,body,link,is_read,created_at").order("created_at", { ascending: false }).limit(30);
    setItems((data as Notif[]) ?? []);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("notif").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => load()).subscribe();
    const iv = setInterval(load, 60000);
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => { supabase.removeChannel(ch); clearInterval(iv); document.removeEventListener("mousedown", onDoc); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAll() {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    load();
  }
  async function markOne(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className={variant === "pill" ? "pill-icon relative" : "relative rounded-lg p-2 text-white/80 hover:bg-white/10"} aria-label={t.notifications}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {unread > 0 && <span className="absolute -top-0.5 -end-0.5 min-w-[18px] rounded-full bg-danger px-1 text-center text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-1 w-80 max-h-96 overflow-auto rounded-2xl bg-white text-ink shadow-xl ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
            <span className="font-semibold">{t.notifications}</span>
            {unread > 0 && <button onClick={markAll} className="text-xs text-brand">{t.markAllRead}</button>}
          </div>
          {items.length === 0 ? <p className="p-4 text-center text-sm text-gray-500">{t.noNotifications}</p> : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id} className={`px-3 py-2 text-sm ${n.is_read ? "" : "bg-surface"}`}>
                  <Link href={n.link ?? "/"} onClick={() => { markOne(n.id); setOpen(false); }} className="block">
                    <div className="font-medium">{n.title}</div>
                    {n.body && <div className="line-clamp-2 text-xs text-gray-600">{n.body}</div>}
                    <div className="text-[11px] text-gray-400">{new Date(n.created_at).toLocaleString()}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
