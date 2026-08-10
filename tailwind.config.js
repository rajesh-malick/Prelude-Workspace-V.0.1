/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Living Mode — warm daylight palette
        sky: {
          light: '#FDF6EC',
          mid: '#F3E9D8',
        },
        ground: '#EDE0C8',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(120, 90, 40, 0.12), 0 1px 2px rgba(120, 90, 40, 0.08)',
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
};
