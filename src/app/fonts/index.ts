import localFont from "next/font/local";

// Official identity typeface: ITF Qomra Arabic (Light 300, Regular 400, Medium 500, Bold 700, Black 900)
export const qomra = localFont({
  src: [
    { path: "./itfQomraArabic-Light.ttf", weight: "300", style: "normal" },
    { path: "./itfQomraArabic-Regular.ttf", weight: "400", style: "normal" },
    { path: "./itfQomraArabic-Medium.ttf", weight: "500", style: "normal" },
    { path: "./itfQomraArabic-Bold.ttf", weight: "700", style: "normal" },
    { path: "./itfQomraArabic-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-qomra",
  display: "swap",
  preload: true,
});
