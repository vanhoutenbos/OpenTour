import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        green: {
          950: '#052e16',
        },
        // Semantic theme tokens — resolve via CSS vars in globals.css,
        // which are flipped between :root (light) and .dark (dark).
        // Use these instead of raw gray-*/slate-* for anything that should
        // adapt between light and dark mode.
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
          4: 'rgb(var(--surface-4) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border-default) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'rgb(var(--content-primary) / <alpha-value>)',
          secondary: 'rgb(var(--content-secondary) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
          inverse: 'rgb(var(--content-inverse) / <alpha-value>)',
        },
        // Score signal colors — functional, not decorative. Same meaning in
        // both themes (red=under par, green=even, gray=over par/no data),
        // but the exact shade is tuned per-mode in globals.css for contrast.
        score: {
          under: 'rgb(var(--score-under-par) / <alpha-value>)',
          even: 'rgb(var(--score-even-par) / <alpha-value>)',
          over: 'rgb(var(--score-over-par) / <alpha-value>)',
          muted: 'rgb(var(--score-muted) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
