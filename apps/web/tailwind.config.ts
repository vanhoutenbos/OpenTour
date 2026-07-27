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
        /* Semantic theme tokens — resolve via CSS vars in globals.css */
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
          4: 'rgb(var(--surface-4) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'rgb(var(--content-primary) / <alpha-value>)',
          secondary: 'rgb(var(--content-body) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
          inverse: 'rgb(var(--content-inverse) / <alpha-value>)',
        },
        /* Score signal colors — functioneel, aangepast per theme */
        score: {
          under: 'rgb(var(--score-under-par) / <alpha-value>)',
          even: 'rgb(var(--score-even-par) / <alpha-value>)',
          over: 'rgb(var(--score-over-par) / <alpha-value>)',
          muted: 'rgb(var(--score-muted) / <alpha-value>)',
        },
      },
      /* Typography scale */
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
        'heading': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'subheading': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.005em', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.65', fontWeight: '400' }],
        'caption': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'label': ['0.75rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.12em' }],
      },
      /* Spacing */
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      /* Border radius */
      borderRadius: {
        'card': '20px',
        'button': '12px',
      },
      /* Box shadow — subtiel, geen harde schaduw */
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)',
        'button': '0 1px 2px rgba(0,0,0,0.03)',
      },
      /* Max widths */
      maxWidth: {
        'admin': '1600px',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
};

export default config;
