/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0f",
        paper: "#1a1a2e", 
        panel: "#16213e",
        accent: "#ff6b6b",
        accent2: "#4ecdc4",
        accent3: "#45b7d1",
        glow: "#667eea",
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(255, 107, 107, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(255, 107, 107, 0.6)' },
        }
      }
    },
  },
  plugins: [],
};
