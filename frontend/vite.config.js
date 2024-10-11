import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        https: "https://gym-tracker-brown.vercel.app/",
        // target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
        // rewrite:(path)=>path.replace(/^\/api/,"")
      },
    },
  },
});
