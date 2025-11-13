import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: { port: 1234 },
  plugins: [nodePolyfills(), react(), tailwindcss()],
  base: "/hot-connector/",
});
