import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'n-1': '#FFFFFF',
        'n-2': '#F7F8F8',
        'n-3': '#F1F2F2',
        'n-4': '#E4E5E7',
        'n-5': '#CDCED1',
        'n-6': '#A9AAAD',
        'n-7': '#636466',
        'n-8': '#0E0C15',
      },
      backgroundImage: {
        'gradient-border':
          'linear-gradient(90deg, #9333EA, #06B6D4, #84CC16, #EC4899)',
      },
    },
  },
  plugins: [],
} satisfies Config;
