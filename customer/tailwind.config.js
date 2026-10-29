module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // SHEIN-style light scheme. Names kept stable so class usage is theme-driven.
        ink:   "#ffffff", // page background
        ink2:  "#f5f5f5", // alt surface
        cream: "#1c1c1c", // primary text (cream/XX opacity → grays)
        gold:  "#111111", // headings / brand near-black
        gold2: "#ff3e6d", // SHEIN pink accent
        line:  "#e6e6e6", // hairline borders
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        sans:    ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
