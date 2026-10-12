/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: 'rgb(var(--paper) / <alpha-value>)',
          raised: 'rgb(var(--paper-raised) / <alpha-value>)',
          sunken: 'rgb(var(--paper-sunken) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft) / <alpha-value>)',
          mute: 'rgb(var(--ink-mute) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        oxblood: {
          DEFAULT: 'rgb(var(--oxblood) / <alpha-value>)',
          600: 'rgb(var(--oxblood-600) / <alpha-value>)',
          700: 'rgb(var(--oxblood-700) / <alpha-value>)',
        },
        saffron: {
          DEFAULT: 'rgb(var(--saffron) / <alpha-value>)',
          600: 'rgb(var(--saffron-600) / <alpha-value>)',
        },
        sage: 'rgb(var(--sage) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Familjen Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        book: '0 12px 30px -14px rgba(20, 12, 6, 0.45)',
        lift: '0 22px 45px -22px rgba(20, 12, 6, 0.55)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.35)',
      },
      borderRadius: {
        xl2: '1.35rem',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        settle: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        settle: 'settle 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
}
