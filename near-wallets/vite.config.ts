import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const pkg = process.env.PACKAGE!;
const EXAMPLE = process.env.EXAMPLE!;

export default defineConfig({
  plugins: [nodePolyfills()],
  root: "./",
  build: {
    emptyOutDir: false,
    outDir: EXAMPLE ? "../example/public/repository" : "../repository",
    rollupOptions: {
      input: {
        main: `./src/${pkg}`,
      },
      output: {
        entryFileNames: `${pkg}.js`,
        assetFileNames: `${pkg}.js`,
        format: "iife",
      },
    },
  },
});
