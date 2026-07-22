/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f5fa",
          100: "#dce7f2",
          200: "#bccfe5",
          300: "#92aed1",
          400: "#6489b8",
          500: "#3d6ba0",  // primary — navy
          600: "#2c5385",
          700: "#1e3a5f",  // deep navy
          800: "#16293f",
          900: "#0f1c2c",
        },
        gold: "#d4a853",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          '"Noto Sans SC"',
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
