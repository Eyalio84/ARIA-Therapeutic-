import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface:  "#0f0f0f",
        panel:    "#161616",
        border:   "#262626",
        muted:    "#404040",
        aria:     "#7c6af7",
        "aria-dim": "#4a3fa3",
        gold:     "#c9a96e",
        "gold-light": "#e0c080",
        "gold-dark": "#a07840",
        "gold-dim": "#8a7748",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
}

export default config
