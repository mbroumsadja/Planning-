import type { Config } from "tailwindcss";

// Tokens de design : toutes les couleurs et polices passent par ici.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1C2430", soft: "#5B6675", faint: "#8A94A3" },
        paper: { DEFAULT: "#FAFAF8", card: "#FFFFFF", line: "#E7E5E0", tint: "#F3F2EE" },
        brand: { DEFAULT: "#0F766E", dark: "#0B5C56", soft: "#E3F3F1" },
        garde: { DEFAULT: "#B42318", bg: "#FEE4E2" },
        permanence: { DEFAULT: "#175CD3", bg: "#DCEBFF" },
        repos: { DEFAULT: "#027A48", bg: "#D5F5E3" },
        warn: { DEFAULT: "#B54708", bg: "#FEF0C7" },
      },
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "serif"],
        sans: ["Figtree", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: { card: "20px" },
      boxShadow: { soft: "0 10px 30px -12px rgba(28,36,48,0.18)" },
    },
  },
  plugins: [],
};

export default config;
