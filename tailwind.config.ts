import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep forest/olive greens — brand anker og aktive elementer
        grass: {
          50:  "#e8edd8",
          100: "#ccd6b0",
          200: "#a8b880",
          300: "#849858",
          400: "#636b3c",  // olivengrøn (swatch)
          500: "#4d5430",
          600: "#3b4024",
          700: "#2e3320",
          800: "#252b1c",  // dyb skovgrøn (swatch)
          900: "#1a1e14",  // baggrund
        },
        // Varme jordfarver — tekst, grænser, lette flader
        earth: {
          50:  "#faf4ec",
          100: "#f0e5d4",
          200: "#e2cbb0",  // creme/linned (swatch) — primær tekst
          300: "#d4b090",
          400: "#c0966e",  // karamel (swatch) — sekundær tekst
          500: "#a07848",
          600: "#7e5c30",
          700: "#5c4220",
          800: "#3d2e16",  // bark/mørk brun (swatch)
          900: "#261a0a",
        },
        // Terrakotta — primær knap, varme accenter
        clay: {
          50:  "#fdf5ef",
          100: "#fae6d4",
          200: "#f4c8a0",
          300: "#eaa468",
          400: "#dc7e44",
          500: "#c4622a",  // terrakotta (swatch)
          600: "#9e4a1e",
          700: "#7a3414",
          800: "#58220c",
          900: "#381206",
        },
        // Oxblood/burgundy — urgent, fejl, alarm
        ox: {
          50:  "#fdf2f2",
          100: "#f8dede",
          200: "#f0b4b4",
          300: "#e08080",
          400: "#c85050",
          500: "#a43030",
          600: "#7a2828",  // burgundy (swatch)
          700: "#5c1c1c",
          800: "#401212",
          900: "#280a0a",
        },
        // Himmelblå — vejr og vand
        sky: {
          50:  "#f0f6ff",
          100: "#ddeeff",
          200: "#bad8fe",
          300: "#7cb8fb",
          400: "#3a96f4",
          500: "#1078e0",
          600: "#045db8",
          700: "#044a96",
          800: "#083c7a",
          900: "#0c3264",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        xl:  "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
