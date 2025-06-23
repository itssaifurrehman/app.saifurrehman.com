// tailwind-config.js
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: "#16a34a", // Green
        secondary: "#4f46e5", // Indigo
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-5px)" },
          "40%, 80%": { transform: "translateX(5px)" },
        },
      },
      animation: {
        shake: "shake 0.4s ease-in-out",
      },
    },
  },
};
