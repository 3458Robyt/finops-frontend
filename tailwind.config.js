export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "tak-yellow": "var(--color-accent)",
        "zinc-950": "var(--color-paper)",
        "zinc-900": "var(--color-paper-2)",
        "zinc-800": "var(--color-paper-3)",
        "zinc-700": "var(--color-rule-strong)",
        "zinc-400": "var(--color-ink-2)",
        "finops-paper": "var(--color-paper)",
        "finops-surface": "var(--color-paper-2)",
        "finops-raised": "var(--color-paper-3)",
        "finops-ink": "var(--color-ink)",
        "finops-muted": "var(--color-ink-2)",
        "finops-meta": "var(--color-ink-3)",
        "finops-rule": "var(--color-rule)",
        "finops-focus": "var(--color-focus)",
        "finops-positive": "var(--color-positive)",
        "finops-warning": "var(--color-warning)",
        "finops-danger": "var(--color-danger)",
      },
      fontFamily: {
        "display": ["var(--font-display)"],
        "body": ["var(--font-body)"],
        "mono": ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
}
