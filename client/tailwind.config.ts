import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0F2F4A",
          sky: "#00B3D8",
          sand: "#F6F1EA",
        },
        kpi: {
          green: "#27AE60",
          yellow: "#F2C94C",
          red: "#EB5757",
        },
      },
      boxShadow: {
        card: "0 15px 35px rgba(15, 47, 74, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

