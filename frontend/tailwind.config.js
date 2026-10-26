/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'Roboto', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        monday: {
          border: '#d0d4e4',
          hover: '#f6f7fb',
          text: '#323338',
          subtext: '#676879',
          blue: '#0073ea',
        },
      },
    },
  },
  plugins: [],
};

