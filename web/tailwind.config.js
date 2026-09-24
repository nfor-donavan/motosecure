/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EEF2F9",
          100: "#D7E1F1",
          200: "#AFC3E3",
          300: "#7E9CCC",
          400: "#4A6FA8",
          500: "#2A4E85",
          600: "#1B3A6B",
          700: "#142C52",
          800: "#0F213E",
          850: "#0B1A32",
          900: "#0A1628",
          950: "#060D19",
        },
        gold: {
          50: "#FFF8E9",
          100: "#FFEDC2",
          200: "#FFDD8A",
          300: "#FFC94D",
          400: "#FFB627",
          500: "#F5A623",
          600: "#DD8B0F",
          700: "#B56D0B",
          800: "#8A530C",
        },
        cm: {
          green: "#1E7B44",
          red: "#C8272B",
          yellow: "#F3C312",
        },
      },
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 0 rgba(11,26,50,0.04), 0 8px 24px -12px rgba(11,26,50,0.18)",
        "panel-dark": "0 1px 0 rgba(0,0,0,0.3), 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1B3A6B 0%, #0A1628 100%)",
      },
    },
  },
  plugins: [],
};
