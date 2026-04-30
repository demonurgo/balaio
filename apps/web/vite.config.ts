import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts"
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3333",
      "/health": "http://localhost:3333",
      "/socket.io": {
        target: "http://localhost:3333",
        ws: true
      }
    }
  }
});
