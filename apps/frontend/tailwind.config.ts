import type { Config } from 'tailwindcss';
import { theme } from './src/theme.config';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colors sourced from theme.config.ts — edit there to rebrand
      colors: {
        brand:   theme.colors.brand,
        surface: theme.colors.surface,
      },

      // Fonts sourced from theme.config.ts
      fontFamily: {
        sans: [...theme.fonts.sans] as string[],
        mono: [...theme.fonts.mono] as string[],
      },

      screens: {
        xs:  '375px',
        '3xl': '1920px',
      },

      animation: {
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'slide-in-up':    'slideInUp 0.2s ease-out',
        'fade-in':        'fadeIn 0.15s ease-out',
      },

      keyframes: {
        slideInRight: {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        slideInUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
