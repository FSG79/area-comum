import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f2f6f4",
          100: "#dfe9e4",
          200: "#c0d3ca",
          300: "#97b5a8",
          400: "#6d9486",
          500: "#4f7869",
          600: "#3d6053",
          700: "#334f45",
          800: "#2a4039",
          900: "#122f27",
          950: "#0a1d17",
        },
        cream: {
          50: "#fdfbf7",
          100: "#f8f3e9",
          200: "#f2e9d9",
          300: "#e9dcc6",
          400: "#dcc9a8",
        },
        gold: {
          50: "#fdf9ed",
          100: "#f9efce",
          200: "#f2dc9c",
          300: "#eac469",
          400: "#e0ad43",
          500: "#d19a2f",
          600: "#b47a25",
          700: "#905d22",
          800: "#774b22",
          900: "#653f21",
        },
        line: "#e7ddcb",
        paper: "#f7f2e8",
        stamp: {
          red: "#d61f5c",
          blue: "#146fae",
          yellow: "#f0bf1f",
        },
        brand: {
          50: "#f2f6f4",
          100: "#dfe9e4",
          200: "#c0d3ca",
          300: "#97b5a8",
          400: "#6d9486",
          500: "#4f7869",
          600: "#3d6053",
          700: "#334f45",
          800: "#2a4039",
          900: "#122f27",
        },
        sand: "#f7f2e8",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Iowan Old Style",
          "Palatino Linotype",
          "Palatino",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
      },
      boxShadow: {
        soft: "0 18px 40px -28px rgba(18, 47, 39, 0.35)",
        lift: "0 24px 60px -32px rgba(18, 47, 39, 0.45)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      letterSpacing: {
        widest2: "0.22em",
      },
    },
  },
  plugins: [],
};

export default config;
