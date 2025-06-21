import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // Import the path module

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api/entrys/": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
      "/api/users/": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
      "/api/profile-image/": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
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
