import type { Metadata } from "next";
import { cookies } from "next/headers";
import { I18nProvider } from "@/components/I18nProvider";
import { branding } from "@/lib/branding";
import type { Locale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: branding.nameAr,
  description: branding.nameEn,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value === "en" ? "en" : "ar") as Locale;
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
