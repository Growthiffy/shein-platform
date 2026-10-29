module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink:   "#ffffff",
        ink2:  "#f5f5f5",
        cream: "#1c1c1c",
        gold:  "#111111",
        gold2: "#ff3e6d",
        line:  "#e6e6e6",
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        sans:    ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
