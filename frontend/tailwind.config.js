/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.html", // Add this line to include HTML files in the public directory
    "./components/**/*.{js,ts,jsx,tsx}", // Add this line to include files in the components directory
    "./src/pages/**/*.{js,ts,jsx,tsx}", // Add this line to include files in the pages directory
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
