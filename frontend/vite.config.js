import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // Import the path module

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api/entrys/": {
        target: "https://gym-tracker-brown.vercel.app/",
        // target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
        // rewrite:(path)=>path.replace(/^\/api/,"")
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "./src"
      ), // Map '@' to the 'src' directory
    },
  },
});
