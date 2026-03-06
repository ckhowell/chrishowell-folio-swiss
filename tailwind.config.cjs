const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./src/**/*.{astro,html,js,ts}'],
  theme: {
    screens: {
      's': '640px',
      'm': '1025px',
    },
    fontSize: {
      'xs':   ['0.75rem',  { lineHeight: '1.25' }],
      'sm':   ['0.8rem',   { lineHeight: '1.25' }],
      'base': ['0.825rem', { lineHeight: '1.25' }],
      'lg':   ['1rem',     { lineHeight: '1.25' }],
      'xl':   ['1.25rem',  { lineHeight: '1.25' }],
      '2xl':  ['2rem',     { lineHeight: '1.1' }],
      '3xl':  ['3rem',     { lineHeight: '1.1' }],
      'h6':   ['1rem',       { lineHeight: '1.2' }],
      'h5':   ['1.618rem',   { lineHeight: '1.15' }],
      'h4':   ['2.618rem',   { lineHeight: '1.1' }],
      'h3':   ['4.236rem',   { lineHeight: '1' }],
      'h2':   ['6.854rem',   { lineHeight: '1', letterSpacing: '-0.01em' }],
      'h1':   ['11.089rem',  { lineHeight: '0.95', letterSpacing: '-0.02em' }],
    },
    spacing: {
      '0': '0',
      '1': '0.0625rem',
      '4': '0.25rem',
      '8': '0.5rem',
      '12': '0.75rem',
      '16': '1rem',
      '20': '1.25rem',
      '24': '1.5rem',
      '28': '1.75rem',
      '32': '2rem',
      '40': '2.5rem',
      '48': '3rem',
      '64': '4rem',
      '80': '5rem',
      '100': '6.25rem',
      '120': '7.5rem',
      '160': '10rem',
    },
    extend: {
      fontFamily: {
        sans: ['PP Neue Montreal', ...defaultTheme.fontFamily.sans],
      },
      borderWidth: {
        '1': '0.0625rem',
      },
      aspectRatio: {
        '520/370': '520 / 370',
      },
    },
  },
  plugins: [],
};
