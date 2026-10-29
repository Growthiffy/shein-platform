module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink:   "#0b0b0d",
        gold:  "#c9a24a",
        gold2: "#e9d08b",
        cream: "#f6f1e7",
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        sans:    ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
