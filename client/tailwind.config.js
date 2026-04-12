/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0B141A",
          surface: "#111B21",
          input: "#1A2630",
          border: "#233040",
          text: "#E9EDEF",
          muted: "#8696A0",
        },
        accent: {
          DEFAULT: "#2563EB",
          light: "#3B82F6",
          dark: "#1D4ED8",
        },
        bubble: {
          own: "#1E3A5F",
          other: "#1A2332",
        },
      },
    },
  },
  plugins: [],
};
