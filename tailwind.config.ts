import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand)",
          dark: "var(--brand-dark)",
          light: "var(--brand-light)",
          accent: "var(--brand-accent)",
        },
        surface: "var(--surface)",
        ink: "var(--ink)",
      },
      fontFamily: {
        sans: ["var(--font-qomra)", "Segoe UI", "Tahoma", "Arial", "sans-serif"],
      },
      // ITF Qomra ships 300/400/500/700/900 only — map the rest to real files (no faux-bold).
      fontWeight: {
        thin: "300", extralight: "300", light: "300",
        normal: "400", medium: "500", semibold: "700", bold: "700",
        extrabold: "900", black: "900",
      },
    },
  },
  plugins: [],
} satisfies Config;
