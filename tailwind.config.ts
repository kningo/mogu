import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        slate: {
          50: "rgb(var(--slate-50) / <alpha-value>)",
          100: "rgb(var(--slate-100) / <alpha-value>)",
          200: "rgb(var(--slate-200) / <alpha-value>)",
          300: "rgb(var(--slate-300) / <alpha-value>)",
          400: "rgb(var(--slate-400) / <alpha-value>)",
          500: "rgb(var(--slate-500) / <alpha-value>)",
          600: "rgb(var(--slate-600) / <alpha-value>)",
          700: "rgb(var(--slate-700) / <alpha-value>)",
          800: "rgb(var(--slate-800) / <alpha-value>)",
          850: "rgb(var(--slate-850) / <alpha-value>)",
          900: "rgb(var(--slate-900) / <alpha-value>)",
          950: "rgb(var(--slate-950) / <alpha-value>)",
        },
        emerald: {
          200: "rgb(var(--emerald-200) / <alpha-value>)",
          300: "rgb(var(--emerald-300) / <alpha-value>)",
          400: "rgb(var(--emerald-400) / <alpha-value>)",
          500: "rgb(var(--emerald-500) / <alpha-value>)",
          600: "rgb(var(--emerald-600) / <alpha-value>)",
          800: "rgb(var(--emerald-800) / <alpha-value>)",
          950: "rgb(var(--emerald-950) / <alpha-value>)",
        },
        amber: {
          200: "rgb(var(--amber-200) / <alpha-value>)",
          300: "rgb(var(--amber-300) / <alpha-value>)",
          400: "rgb(var(--amber-400) / <alpha-value>)",
          500: "rgb(var(--amber-500) / <alpha-value>)",
          800: "rgb(var(--amber-800) / <alpha-value>)",
          950: "rgb(var(--amber-950) / <alpha-value>)",
        },
        teal: {
          300: "rgb(var(--teal-300) / <alpha-value>)",
          400: "rgb(var(--teal-400) / <alpha-value>)",
        },
        cyan: {
          300: "rgb(var(--cyan-300) / <alpha-value>)",
          400: "rgb(var(--cyan-400) / <alpha-value>)",
          800: "rgb(var(--cyan-800) / <alpha-value>)",
          950: "rgb(var(--cyan-950) / <alpha-value>)",
        },
        sky: {
          300: "rgb(var(--sky-300) / <alpha-value>)",
          400: "rgb(var(--sky-400) / <alpha-value>)",
        },
        indigo: {
          300: "rgb(var(--indigo-300) / <alpha-value>)",
          400: "rgb(var(--indigo-400) / <alpha-value>)",
          800: "rgb(var(--indigo-800) / <alpha-value>)",
          950: "rgb(var(--indigo-950) / <alpha-value>)",
        },
      },
      fontFamily: {
        japanese: [
          '"Hiragino Kaku Gothic ProN"',
          '"Yu Gothic"',
          '"Noto Sans JP"',
          'Meiryo',
          'sans-serif',
        ],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};

export default config;
