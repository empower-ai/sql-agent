/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/web/app/**/*.{js,ts,jsx,tsx}',
    './src/web/pages/**/*.{js,ts,jsx,tsx}',
    './src/web/components/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {}
  },
  variants: {
    extend: {
      visibility: ['group-hover']
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
