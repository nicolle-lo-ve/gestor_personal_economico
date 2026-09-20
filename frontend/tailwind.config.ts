/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#059669",
          foreground: "#ffffff",
        },
        income: "#10b981",
        expense: "#ef4444",
        warning: "#f59e0b",
        goal: "#6366f1",
      },
      fontFamily: {
        sans: ["Inter Variable", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
}
