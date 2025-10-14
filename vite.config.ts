// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// This is a cleaner way to handle the proxy
const devProxy = {
  "/api": {
    target: "http://localhost:3001",
    changeOrigin: true,
  },
};

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // The proxy is now explicitly 'undefined' in production
    proxy: mode === "development" ? devProxy : undefined,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
