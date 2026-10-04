/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // EnVault Semantic Tokens
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        'line-subtle': 'var(--line-subtle)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        fg: {
          DEFAULT: 'var(--fg)',
          muted: 'var(--fg-muted)',
          subtle: 'var(--fg-subtle)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)'
        },
        'on-accent': 'var(--on-accent)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        warn: 'var(--warn)'
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      borderRadius: {
        chip: '4px',
        control: '6px',
        panel: '8px',
        dialog: '12px'
      },
      fontSize: {
        display: ['20px', { lineHeight: '28px' }],
        title: ['14px', { lineHeight: '20px' }],
        ui: ['13px', { lineHeight: '20px' }],
        meta: ['12px', { lineHeight: '16px' }]
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 140ms ease-out forwards'
      }
    }
  },
  plugins: []
}
