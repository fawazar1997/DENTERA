import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eafbfb",
          100: "#cef5f5",
          200: "#9eeaeb",
          300: "#63d8da",
          400: "#34bec1",
          500: "#1ba3a6",
          600: "#148588",
          700: "#146a6d",
          800: "#155559",
          900: "#14484b",
          950: "#072a2c",
        },
        accent: {
          50: "#fbf8f3",
          100: "#f3ebdd",
          200: "#e6d4b8",
          300: "#d6b98d",
          400: "#c7a379",
          500: "#b98f63",
          600: "#a17750",
          700: "#836043",
          800: "#6a4d38",
          900: "#57402f",
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
          "Poppins",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        arabic: [
          "Tajawal",
          "Segoe UI",
          "Tahoma",
          "Geeza Pro",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(20, 72, 75, 0.18)",
        card: "0 4px 20px -4px rgba(20, 72, 75, 0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at 1px 1px, rgba(20,72,75,0.08) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;
