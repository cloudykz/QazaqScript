tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'Cambria', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'Monaco', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#e34c26',
          hover: '#c73e1d',
          light: '#fff4f0',
        },
        ink: {
          DEFAULT: '#1a1a1a',
          muted: '#5c5c5c',
          faint: '#949494',
        },
        surface: {
          DEFAULT: '#ffffff',
          warm: '#faf9f7',
          border: '#e8e6e3',
        },
      },
      maxWidth: {
        prose: '65ch',
        site: '72rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
      },
    },
  },
};
