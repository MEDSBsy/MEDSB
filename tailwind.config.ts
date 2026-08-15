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
          mid: "var(--brand-mid)",
        },
        danger: { DEFAULT: "var(--danger)", dark: "var(--danger-dark)", deep: "var(--danger-deep)" },
        wheat: { 100: "#edebe0", 500: "#b9a779", 700: "#988561" },
        forest: { 400: "#428177", 700: "#054239", 900: "#002623" },
        umber: { 500: "#6b1f2a", 700: "#4a151e", 900: "#260f14" },
        charcoal: { 700: "#3d3a3b", 900: "#161616" },
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
