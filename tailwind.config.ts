import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eefbf8",
          100: "#d4f4ec",
          200: "#aae8da",
          300: "#75d5c1",
          400: "#43bba5",
          500: "#279e8b",
          600: "#1c7f71",
          700: "#1a655c",
          800: "#18514a",
          900: "#17433e",
          950: "#082825",
        },
        accent: {
          50: "#fdf8ed",
          100: "#faedd0",
          200: "#f4d89f",
          300: "#edbd63",
          400: "#e8a53a",
          500: "#dc8a24",
          600: "#c06a1b",
          700: "#9f4d1a",
          800: "#823d1b",
          900: "#6c3319",
        },
        ink: {
          50: "#f4f6f7",
          100: "#e3e8ea",
          200: "#c9d2d6",
          300: "#a2b1b8",
          400: "#748994",
          500: "#586e79",
          600: "#4b5c67",
          700: "#404e57",
          800: "#38434a",
          900: "#242c31",
          950: "#15191c",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        arabic: [
          "Segoe UI",
          "Tahoma",
          "Geeza Pro",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(23, 67, 62, 0.18)",
        card: "0 4px 20px -4px rgba(23, 67, 62, 0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at 1px 1px, rgba(23,67,62,0.08) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;
