/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#fbfbfd',
          subtle: '#f4f4f6',
          border: 'rgba(0, 0, 0, 0.08)'
        }
      }
    },
  },
  plugins: [],
};
