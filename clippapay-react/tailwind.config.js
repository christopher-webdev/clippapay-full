/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cp-blue':    '#4F46E5',  // primary
        'cp-indigo':  '#6366F1',  // secondary
        'cp-cyan':    '#22D3EE',  // accent
        'cp-teal':    '#14B8A6',  // success
        'cp-amber':   '#F59E0B',  // warning
        'cp-rose':    '#F43F5E',  // alert
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
};
