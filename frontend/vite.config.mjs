import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return defineConfig({
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      hmr: { clientPort: 443 }, // ajuda HMR atrás do ngrok
      proxy: {
        // Ajuste o caminho conforme seu backend (ex.: /api, /v1, etc.)
        "/backend": {
          target: "http://localhost:3000", // porta do seu backend
          changeOrigin: true,
          ws: true,
        },
      },
    },
  });
};