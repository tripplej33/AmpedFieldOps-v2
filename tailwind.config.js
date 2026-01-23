/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#127da1",
        "background-light": "#fafafa",
        "background-dark": "#121417",
        "card-dark": "#1c2426",
        "accent-amber": "#f59e0b",
        "nav-hover": "#293438",
        "border-dark": "#3c4d53",
        "text-muted": "#9db2b8",
        "text-disabled": "#64748b",
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
    },
  },
  plugins: [],
}
