module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./styling/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      'none': '0',
      'sm': '0.125rem',
      DEFAULT: '0.25rem',
      DEFAULT: '4px',
      'md': '0.375rem',
      'lg': '0.5rem',
      'full': '9999px',
      'large': '12px',
      'xl': '48px',
    },
    extend: {
      colors: {
        "gray-1000": "#2d3748",
        "gray-1100": "#27303f",
        "gray-1200": "#1d242f",
        "gray-1300": "#3f3f46",
        "blue-1000": "#007ee6",
        "blue-1100": "#004de6",
        "blue-1200": "#001E36",
        "blue-1300": "#007ee6",
        "blue-1400": "#004680",
        "blue-1500": "#e6f4ff",
        "red-1000": "#FF6363",
        "orange-1000": "#FFA163",
        "yellow-1000": "#C9BF4E",
        "green-1000": "#3FC567",
        "purple-1000": "#7863FF",
        "pink-1000": "#F263FF",
        "brown-1000": "#996633",
      },
    },
  },
  plugins: [require("daisyui")], // Add DaisyUI here
};
