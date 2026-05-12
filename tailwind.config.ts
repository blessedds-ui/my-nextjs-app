import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        grid: "rgba(0, 240, 255, 0.06)",
        cyan: { glow: "#00f0ff", dim: "rgba(0, 240, 255, 0.35)" },
        violet: { glow: "#a78bfa", dim: "rgba(167, 139, 250, 0.4)" },
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(0, 240, 255, 0.12), 0 25px 80px -20px rgba(0, 0, 0, 0.7)",
        innerGlow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      animation: {
        pulseSlow: "pulseSlow 4s ease-in-out infinite",
        scan: "scan 8s linear infinite",
      },
      keyframes: {
        pulseSlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.85" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
