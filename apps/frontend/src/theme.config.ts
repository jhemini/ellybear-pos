/**
 * Ellybear POS — Design Tokens
 * ─────────────────────────────
 * Edit this file to customize every visual aspect of the application.
 *
 * Values here are consumed by:
 *   1. tailwind.config.ts  → generates Tailwind CSS utility classes
 *   2. globals.css         → exposes values as CSS custom properties (--var-name)
 *
 * Restart the dev server after making changes so Tailwind can rebuild.
 */

export const theme = {
  // ─── Brand / Accent Color Scale ────────────────────────────────────────────
  // Warm coral-red used for buttons, active states, focus rings, highlights.
  colors: {
    brand: {
      50:  '#fff5f4',
      100: '#ffe4e2',
      200: '#ffcac7',
      300: '#ff9f9a',
      400: '#ff6b63',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },

    // Page and card background surfaces
    surface: {
      DEFAULT: '#ffffff',
      muted:   '#fdf4f3',  // warm blush — main page background
      subtle:  '#fde8e6',  // slightly deeper — hover / alternating rows
    },

    // Left navigation sidebar — light, clean white design
    sidebar: {
      bg:         '#ffffff',  // pure white background
      text:       '#1f2937',  // dark text for white bg
      textMuted:  '#9ca3af',  // secondary / icon color (gray-400)
      border:     '#f3f4f6',  // very subtle right border (gray-100)
      itemHover:  '#fff5f4',  // warm blush hover
      itemActive: '#fff0ef',  // active item background (warm pink)
    },

    // General text hierarchy
    text: {
      primary:   '#111827',  // nearly black — headings, strong content
      secondary: '#6b7280',  // supporting text
      muted:     '#9ca3af',  // hints, placeholders, timestamps
    },

    border:  '#f3f4f6',  // default border — subtle (gray-100)
    danger:  '#dc2626',  // red — destructive actions
    warning: '#d97706',  // amber — offline / warnings
    success: '#16a34a',  // green — success states
  },

  // ─── Typography ──────────────────────────────────────────────────────────
  fonts: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },

  fontSizes: {
    xs:    '0.75rem',   // 12px — labels, badges, captions
    sm:    '0.875rem',  // 14px — body copy, nav items, table rows
    base:  '1rem',      // 16px — default body
    lg:    '1.125rem',  // 18px — section headings
    xl:    '1.25rem',   // 20px — card titles
    '2xl': '1.5rem',    // 24px — page headings
    '3xl': '1.875rem',  // 30px — KPI numbers
  },

  // ─── Dashboard Layout ──────────────────────────────────────────────────────
  layout: {
    sidebarWidth:    '72px',    // narrow icon-only sidebar
    headerHeight:    '64px',    // POS top bar height
    contentPadding:  '1.5rem',  // padding inside main content area
    sidebarPaddingX: '0.75rem', // horizontal padding inside sidebar
    navItemGap:      '0.5rem',  // gap between nav items
  },

  // ─── Component Spacing ─────────────────────────────────────────────────────
  spacing: {
    cardPadding:   '1.25rem',  // 20px — inside .card panels
    sectionGap:    '1.5rem',   // 24px — between page sections
    inputPaddingX: '0.75rem',  // 12px — text input horizontal
    inputPaddingY: '0.625rem', // 10px — text input vertical
  },

  // ─── Shadows ───────────────────────────────────────────────────────────────
  shadows: {
    card:  '0 1px 4px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
    panel: '0 4px 16px -4px rgb(0 0 0 / 0.10)',
    modal: '0 20px 40px -8px rgb(0 0 0 / 0.18)',
  },

  // ─── Motion ────────────────────────────────────────────────────────────────
  transitions: {
    fast:   '100ms ease-out',
    normal: '150ms ease-out',
    slow:   '200ms ease-out',
  },
} as const;

export type Theme = typeof theme;
