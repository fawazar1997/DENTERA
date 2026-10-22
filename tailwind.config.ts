import type { Config } from "tailwindcss";

/** The official Dentera palette — the only colours used on the site. */
const BRAND = {
  teal: "#0CB8CD",
  darkBlue: "#141480",
  beige: "#C8BEB0",
  bone: "#FCF3E8",
  gum: "#DAACAB",
  turquoise: "#08B7CC",
  navyBlue: "#292C87",
};

/**
 * A brand colour mixed into a light base (amount 0–1), for soft
 * backgrounds. Warm colours mix into Bone; Teal mixes into white, since
 * Teal over Bone turns a muddy mint.
 */
function tint(hex: string, amount: number, base: string = BRAND.bone): string {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [rgb(hex), rgb(base)];
  return `#${a
    .map((c, i) => Math.round(b[i] + (c - b[i]) * amount).toString(16).padStart(2, "0"))
    .join("")}`;
}

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Every colour below is one of the seven official colours (BRAND),
      // or a light tint of one (into Bone, or white for Teal) for soft backgrounds and
      // borders. No other hues are generated.
      colors: {
        primary: {
          50: tint(BRAND.teal, 0.08, "#FFFFFF"),
          100: tint(BRAND.teal, 0.16, "#FFFFFF"),
          200: tint(BRAND.teal, 0.3, "#FFFFFF"),
          300: BRAND.turquoise,
          400: BRAND.turquoise,
          500: BRAND.teal,
          600: BRAND.teal,
          700: BRAND.navyBlue, // links and text accents (Teal text is too faint)
          800: BRAND.darkBlue,
          900: BRAND.darkBlue,
          950: BRAND.darkBlue,
        },
        // Gum — soft accents.
        accent: {
          50: tint(BRAND.gum, 0.12),
          100: tint(BRAND.gum, 0.22),
          200: tint(BRAND.gum, 0.4),
          300: BRAND.gum,
          400: BRAND.gum,
          500: BRAND.gum,
          600: BRAND.navyBlue,
          700: BRAND.navyBlue,
          800: BRAND.navyBlue,
          900: BRAND.darkBlue,
        },
        // Beige — warm neutrals.
        sand: {
          50: BRAND.bone,
          100: tint(BRAND.beige, 0.25),
          200: tint(BRAND.beige, 0.45),
          300: tint(BRAND.beige, 0.7),
          400: BRAND.beige,
          500: BRAND.beige,
        },
        // Neutral roles: surfaces and borders are Beige tints on Bone,
        // text is Navy Blue (secondary) and Dark Blue (main).
        ink: {
          50: tint(BRAND.beige, 0.15),
          100: tint(BRAND.beige, 0.35),
          200: tint(BRAND.beige, 0.55),
          300: BRAND.beige,
          400: tint(BRAND.navyBlue, 0.6),
          500: BRAND.navyBlue,
          600: BRAND.navyBlue,
          700: BRAND.navyBlue,
          800: BRAND.navyBlue,
          900: BRAND.darkBlue,
          950: BRAND.darkBlue,
        },
        paper: BRAND.bone,
      },
      // Borders without an explicit colour use a Beige tint, not grey.
      borderColor: {
        DEFAULT: tint(BRAND.beige, 0.35),
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
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(20,20,128,0.2), 0 1px 2px rgba(20,20,128,0.14)",
        "inset-hover": "inset 0 1px 0 0 rgba(255,255,255,0.2), inset 0 0 0 1px rgba(20,20,128,0.24), 0 2px 6px rgba(20,20,128,0.18)",
        focus: "0 0 0 4px rgba(12, 184, 205, 0.2)",
      },
      borderRadius: {
        xl2: "1rem",
      },
      letterSpacing: {
        tighter: "-0.035em",
        tight: "-0.02em",
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
