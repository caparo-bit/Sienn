import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Punto 1: front end comprimido
    minify: "esbuild",
    cssMinify: true,
    target: "es2018",
    chunkSizeWarningLimit: 600,
    // Punto 2: nunca generar source maps en el build de producción
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
