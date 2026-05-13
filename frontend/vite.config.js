import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // Import the path module

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          // Order matters: match specific packages before the generic vendor bucket.
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "react-vendor";
          }
          if (id.includes("react-router")) {
            return "router";
          }
          if (id.includes("@chakra-ui") || id.includes("@emotion")) {
            return "chakra";
          }
          if (id.includes("framer-motion") || id.includes("/motion/")) {
            return "motion";
          }
          if (id.includes("firebase") || id.includes("@firebase")) {
            return "firebase";
          }
          if (id.includes("@supabase")) {
            return "supabase";
          }
          if (id.includes("chart.js") || id.includes("react-chartjs-2")) {
            return "charts";
          }
          return "vendor";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "./src"
      ), // Map '@' to the 'src' directory
    },
  },
  // Note: Proxy configuration removed since we're now using environment variables
  // for API URLs. The proxy was only needed for development with localhost URLs.
});
