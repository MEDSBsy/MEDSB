"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { outbox, syncOutbox } from "@/lib/offline";
import { useI18n } from "@/components/I18nProvider";

export default function PwaSetup() {
  const { t } = useI18n();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  async function refresh() { try { setPending(await outbox.count()); } catch { /* no idb */ } }
  async function sync() {
    const n = await syncOutbox(createClient());
    if (n > 0) refresh();
  }

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    setOnline(navigator.onLine);
    refresh(); sync();
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    window.addEventListener("outbox-changed", refresh);
    const iv = setInterval(sync, 60000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.removeEventListener("outbox-changed", refresh); clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (online && pending === 0) return null;
  return (
    <div className={`fixed bottom-3 start-3 z-50 rounded-full px-3 py-1.5 text-xs shadow ${online ? "bg-wheat-700 text-white" : "bg-charcoal-900 text-white"}`}>
      {!online ? t.offline : ""} {pending > 0 ? `${t.pendingSync}: ${pending}` : ""}
      {online && pending > 0 && <button onClick={sync} className="ms-2 underline">{t.syncNow}</button>}
    </div>
  );
}
