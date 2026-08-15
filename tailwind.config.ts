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
        sans: ["var(--font-sans)", "Tahoma", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
