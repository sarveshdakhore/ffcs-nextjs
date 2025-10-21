/** @type {import('tailwindcss').Config} */
module.exports = {
  ccontent: [
  "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4ecdc4',
          dark: '#35a09a',
          light: '#5fd6d680',
        },
        background: '#1a1a1a',
        text: {
          DEFAULT: '#e0e0e0',
          light: '#b0b0b0',
        },
        table: {
          border: '#444444',
        },
        input: {
          text: '#e0e0e0',
          border: '#555555',
          'border-active': '#4ecdc4',
          'border-shadow': 'rgba(78, 205, 196, 0.25)',
        },
        slot: {
          'button-selected': '#6b3d6b',
        },
        quick: {
          button: '#ff9500',
          'button-highlight': '#4caf50',
        },
        lab: '#2e5cb8',
        theory: '#4a4a8a',
        day: {
          lunch: '#404040',
        },
        period: {
          DEFAULT: '#2a2a2a',
          highlight: '#4caf50',
          clash: '#ff4444',
        },
        'on-clash': '#ffffff',
        'course-list-header-hover': '#2d4332',
        google: {
          blue: '#4285F4',
          red: '#EA4335',
          yellow: '#FBBC05',
          green: '#34A853',
        },
        // Bootstrap-like colors
        success: '#28a745',
        danger: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8',
        dark: '#343a40',
        secondary: '#6c757d',
      },
      backdropBlur: {
        '16': '16px',
      },
      animation: {
        'loading-bounce': 'loading-bounce 1.4s infinite ease-in-out',
      },
      keyframes: {
        'loading-bounce': {
          '0%, 80%, 100%': {
            transform: 'scale(0)',
          },
          '40%': {
            transform: 'scale(1.0)',
          },
        },
      },
      boxShadow: {
        'card': '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
        'card-hover': '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'card': '0.375rem',
      },
    },
  },
  plugins: [],
}
