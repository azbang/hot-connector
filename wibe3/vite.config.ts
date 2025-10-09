import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [nodePolyfills()],
  build: {
    outDir: "build",
    minify: true,
    lib: {
      name: "Wibe3",
      entry: "src/index.ts",
      formats: ["es", "cjs", "iife"],
      fileName: (format) => `wibe3.${format}.js`,
    },
  },
});
