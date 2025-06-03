/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  darkMode: 'class', // Enable class-based dark mode strategy
  theme: {
    extend: {
      colors: {
        // Primary: Bold Black
        "primary": {
          DEFAULT: "#000000",
          light: "#333333",
        },
        // Secondary: Vibrant Orange
        "secondary": {
          DEFAULT: "#FF5722",
          light: "#FF7F50",
        },
        // Accent: Warm Yellow
        "accent": {
          DEFAULT: "#FFC107",
          light: "#FFD54F",
          dark: "#FFA000",
        },
        // Neutral Tones
        "neutral": {
          dark: "#333333",
          medium: "#777777",
          light: "#F5F5F5",
        },
        // Backgrounds
        "background": {
          light: "#FFFFFF",
          dark: "#121212",
          black: "#000000",
        },
        // Text Colors
        "text": {
          dark: "#121212",
          light: "#FFFFFF",
          muted: "#999999",
        },
      },
      fontFamily: {
        sans: ["Inter", "Helvetica", "Arial", "sans-serif"],
        display: ["Inter", "Helvetica", "Arial", "sans-serif"],
      },
      fontSize: {
        '7xl': '5rem',
        '8xl': '6rem',
        '9xl': '7rem',
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        wide: '0.025em',
        wider: '0.05em',
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
