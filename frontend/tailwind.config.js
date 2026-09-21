/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8", // primary soft indigo
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        recall: {
          forgot: "#f87171", // Soft red
          difficult: "#fbbf24", // Amber
          partial: "#fde047", // Yellow
          good: "#60a5fa", // Sky blue
          easy: "#34d399", // Mint green
          leech: "#c084fc", // Purple
        },
      },
      fontFamily: {
        heading: ["'Space Grotesk'", "Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        handwriting: ["'Kalam'", "'Patrick Hand'", "'Caveat'", "cursive"],
        caveat: ["'Caveat'", "cursive"],
        kalam: ["'Kalam'", "cursive"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        "glass-hover": "0 14px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
        "glow-brand": "0 0 24px rgba(129, 140, 248, 0.35)",
        "glow-indigo": "0 0 24px rgba(99, 102, 241, 0.35)",
        "glow-easy": "0 0 24px rgba(52, 211, 153, 0.35)",
        "glow-good": "0 0 24px rgba(96, 165, 250, 0.35)",
        "glow-partial": "0 0 24px rgba(253, 224, 71, 0.35)",
        "glow-difficult": "0 0 24px rgba(251, 191, 36, 0.35)",
        "glow-forgot": "0 0 24px rgba(248, 113, 113, 0.35)",
        "glow-leech": "0 0 24px rgba(192, 132, 252, 0.35)",
      },
      animation: {
        "blob-slow": "blob-drift 60s ease-in-out infinite alternate",
        "blob-reverse": "blob-drift-reverse 75s ease-in-out infinite alternate",
        "blob-pulse": "blob-pulse 45s ease-in-out infinite alternate",
        breathe: "breathe 3s ease-in-out infinite",
        flame: "flame 1.5s ease-in-out infinite alternate",
        "pulse-subtle": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer-sweep": "shimmer 2s infinite linear",
      },
      keyframes: {
        "blob-drift": {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(60px, -80px) scale(1.15)" },
          "66%": { transform: "translate(-50px, 40px) scale(0.95)" },
          "100%": { transform: "translate(40px, 70px) scale(1.05)" },
        },
        "blob-drift-reverse": {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(-80px, 60px) scale(1.1)" },
          "66%": { transform: "translate(70px, -50px) scale(0.9)" },
          "100%": { transform: "translate(-40px, -70px) scale(1.08)" },
        },
        "blob-pulse": {
          "0%": { transform: "scale(1) translate(0, 0)", opacity: "0.45" },
          "50%": { transform: "scale(1.2) translate(30px, -30px)", opacity: "0.6" },
          "100%": { transform: "scale(0.95) translate(-20px, 20px)", opacity: "0.4" },
        },
        breathe: {
          "0%, 100%": {
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(129, 140, 248, 0.2)",
          },
          "50%": {
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35), 0 0 24px rgba(129, 140, 248, 0.45), 0 0 0 1.5px rgba(129, 140, 248, 0.6)",
          },
        },
        flame: {
          "0%": { transform: "scale(1) rotate(-2deg)", filter: "drop-shadow(0 0 4px rgba(251, 146, 60, 0.5))" },
          "50%": { transform: "scale(1.12) rotate(3deg)", filter: "drop-shadow(0 0 10px rgba(249, 115, 22, 0.8))" },
          "100%": { transform: "scale(0.98) rotate(-1deg)", filter: "drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))" },
        },
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(248, 113, 113, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(248, 113, 113, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
