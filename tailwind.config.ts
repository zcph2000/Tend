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
        earth: {
          50: "#f9f6f0",
          100: "#f0e9db",
          200: "#ddd0b8",
          300: "#c7b08e",
          400: "#b08f65",
          500: "#9a7549",
          600: "#7d5e3a",
          700: "#634a2e",
          800: "#4f3b27",
          900: "#3f3022",
        },
        grass: {
          50: "#f3f9ed",
          100: "#e4f2d6",
          200: "#c9e5ae",
          300: "#a5d27d",
          400: "#82bc52",
          500: "#63a135",
          600: "#4c8027",
          700: "#3c6320",
          800: "#324f1d",
          900: "#2a431b",
        },
        sky: {
          50: "#f0f7ff",
          100: "#e0eefe",
          200: "#baddfd",
          300: "#7ec1fc",
          400: "#3aa1f8",
          500: "#1083e9",
          600: "#0465c7",
          700: "#0451a1",
          800: "#084585",
          900: "#0d3b6e",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
