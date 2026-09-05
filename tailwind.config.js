/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--primary-rgb, 18 125 161) / <alpha-value>)",
        "background-light": "#fafafa",
        "background-dark": "var(--bg-main, #101417)",
        "card-dark": "var(--bg-card, #192124)",
        "surface-dark": "var(--bg-surface, #222d30)",
        "accent-amber": "#f59e0b",
        "nav-hover": "var(--bg-nav-hover, #2a373b)",
        "border-dark": "var(--border-main, #3f5056)",
        "text-muted": "var(--text-muted, #a2b7bd)",
        "text-disabled": "var(--text-disabled, #6c8087)",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
      },
      backdropBlur: {
        glass: "12px",
      },
      gridTemplateColumns: {
        '14': 'repeat(14, minmax(0, 1fr))',
        '24': 'repeat(24, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}
