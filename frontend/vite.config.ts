import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom")
            ) {
              return "vendor-react";
            }
            if (id.includes("framer-motion") || id.includes("lucide-react")) {
              return "vendor-ui";
            }
            if (id.includes("axios")) {
              return "vendor-http";
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
