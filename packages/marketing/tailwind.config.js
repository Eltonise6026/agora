/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0f0f12",
        border: "#1a1a1f",
        accent: "#a78bfa",
        "accent-dim": "#1e1b2e",
        secondary: "#71717a",
      },
      fontFamily: {
        mono: ["'SF Mono'", "SFMono-Regular", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
