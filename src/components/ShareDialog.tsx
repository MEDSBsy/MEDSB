"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useI18n } from "@/components/I18nProvider";
import { Icon } from "@/components/Icons";
import type { FormRow } from "@/lib/types";

export default function ShareDialog({ form, onClose }: { form: FormRow; onClose: () => void }) {
  const { t } = useI18n();
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/s/${form.share_token}` : `/s/${form.share_token}`;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: "#054239", light: "#ffffff" } }).then(setQr);
  }, [url]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[26px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-[20px] font-bold">{t.shareTitle}</h2>
          <button onClick={onClose} className="icon-btn"><Icon name="x" size={16} /></button>
        </div>
        <p className="text-[13px] font-light text-muted">{form.title}</p>

        {form.status !== "published" && (
          <p className="mt-4 rounded-2xl bg-[#f1ecdc] px-4 py-3 text-[13px] text-[#6b5a2c]">{t.publishFirst}</p>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface p-2">
          <input readOnly value={url} dir="ltr" className="min-w-0 flex-1 bg-transparent px-2 text-[13px] outline-none" onFocus={(e) => e.target.select()} />
          <button onClick={copy} className="btn-primary !py-2 text-[13px]">{copied ? t.copied : t.copyLink}</button>
        </div>
        <p className="mt-2 text-[12px] font-light text-muted">{t.shareHint}</p>
        {form.access_code && (
          <p className="mt-2 text-[13px]"><span className="text-muted">{t.accessCode}:</span> <b dir="ltr" className="font-black tracking-widest">{form.access_code}</b></p>
        )}

        {qr && (
          <div className="mt-5 flex flex-col items-center gap-3">
            <img src={qr} alt="QR" className="h-48 w-48 rounded-2xl border border-line p-2" />
            <div className="flex gap-2">
              <a href={qr} download={`survey-${form.share_token}.png`} className="btn-outline text-[13px]"><Icon name="download" size={14} /> {t.downloadQr}</a>
              <a href={url} target="_blank" className="btn-ghost text-[13px]"><Icon name="external" size={14} /> {t.openLink}</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
