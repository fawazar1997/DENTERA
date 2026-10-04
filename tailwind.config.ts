import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Every color below comes from the four Dentera identity colors only:
      //   cyan #0CB8CD · navy #141480 · beige #C8BEB0 · pink #DAACAB
      // Light steps are each color mixed with white; dark steps are mixed
      // with the identity navy (not black), so even shades stay on-brand.
      colors: {
        // Cyan — logo wordmark color.
        primary: {
          50: "#f0fbfc",
          100: "#ddf5f8",
          200: "#b6eaf0",
          300: "#81dae5",
          400: "#46c9d9",
          500: "#0cb8cd",
          600: "#0e94bc",
          700: "#0f73ad",
          800: "#11569f",
          900: "#123b92",
          950: "#132889",
        },
        // Pink — identity accent.
        accent: {
          50: "#fbf5f5",
          100: "#f5e8e7",
          200: "#edd6d5",
          300: "#e5c5c4",
          400: "#dfb8b7",
          500: "#daacab",
          600: "#a986a0",
          700: "#816898",
          800: "#5f4e90",
          900: "#403589",
        },
        // Beige — logo tooth mark / uniform color.
        sand: {
          50: "#f6f5f2",
          100: "#ece9e4",
          200: "#e0dbd3",
          300: "#d4ccc1",
          400: "#cec5b8",
          500: "#c8beb0",
        },
        // Neutral roles: the light steps (surfaces, borders) are beige
        // tints, the text steps are the identity navy and its tints.
        ink: {
          50: "#f6f5f2",
          100: "#ece9e4",
          200: "#e0dbd3",
          300: "#bdbddb",
          400: "#9595c6",
          500: "#6767ac",
          600: "#6262aa",
          700: "#4c4c9e",
          800: "#30308f",
          900: "#141480",
          950: "#0c0c4d",
        },
        paper: "#f6f5f2",
      },
      // Almarai is the site font for both Arabic and English. It ships in
      // 300/400/700/800, so medium (500) renders as 400 and semibold (600)
      // as 700.
      fontFamily: {
        sans: [
          "Almarai",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Tahoma",
          "Arial",
          "sans-serif",
        ],
        arabic: [
          "Almarai",
          "Segoe UI",
          "Tahoma",
          "Geeza Pro",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 12px 32px -16px rgba(20, 20, 128, 0.18)",
        card: "0 2px 12px -4px rgba(20, 20, 128, 0.08)",
        // Tactile inset technique: a thin light highlight along the top
        // edge plus a soft dark ring, so a dark button reads as pressed
        // into the surface rather than floating above it.
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(12,12,77,0.2), 0 1px 2px rgba(20,20,128,0.14)",
        "inset-hover": "inset 0 1px 0 0 rgba(255,255,255,0.2), inset 0 0 0 1px rgba(12,12,77,0.24), 0 2px 6px rgba(20,20,128,0.18)",
        focus: "0 0 0 4px rgba(12, 184, 205, 0.2)",
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
          "radial-gradient(circle at 1px 1px, rgba(20,20,128,0.07) 1px, transparent 0)",
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
