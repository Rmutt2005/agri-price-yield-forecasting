import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans Thai",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        sand: {
          50: "#fbfaf6",
          100: "#f6f2e6",
          200: "#efe7d0",
        },
        ink: {
          900: "#0b2b2a",
          700: "#1c3f3b",
          500: "#345b55",
        },
        moss: {
          600: "#2f8f6b",
          500: "#3aa879",
          400: "#55c38a",
        },
        sun: {
          300: "#f7e7a9",
          400: "#f1d77d",
        },
        primary: {
          500: "#3aa879",
          600: "#2f8f6b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
