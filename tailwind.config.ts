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
        // Warm neutral scale (paper/charcoal, not blue-gray) — every step is
        // the same warm hue at a different depth, so text, borders and the
        // page background all read as one coherent, unforced palette rather
        // than a generic UI gray scale.
        ink: {
          50: "#faf8f3",
          100: "#ece7db",
          200: "#dcd8cd",
          300: "#bfbbb1",
          400: "#a19d94",
          500: "#86827a",
          600: "#6b6862",
          700: "#52504a",
          800: "#3d3b37",
          900: "#2a2926",
          950: "#1c1b19",
        },
        paper: "#faf8f3",
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
        soft: "0 12px 32px -16px rgba(28, 27, 25, 0.16)",
        card: "0 2px 12px -4px rgba(28, 27, 25, 0.08)",
        // Tactile inset technique: a thin light highlight along the top
        // edge plus a soft dark ring, so a dark button reads as pressed
        // into the surface rather than floating above it.
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(0,0,0,0.12), 0 1px 2px rgba(28,27,25,0.12)",
        "inset-hover": "inset 0 1px 0 0 rgba(255,255,255,0.2), inset 0 0 0 1px rgba(0,0,0,0.16), 0 2px 6px rgba(28,27,25,0.16)",
        focus: "0 0 0 4px rgba(20, 133, 136, 0.15)",
      },
      borderRadius: {
        xl2: "1rem",
      },
      letterSpacing: {
        tighter: "-0.035em",
        tight: "-0.02em",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at 1px 1px, rgba(20,72,75,0.08) 1px, transparent 0)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fade-in 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
