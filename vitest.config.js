import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Standalone Vitest config — vitest.config.js takes precedence over vite.config.js
// and keeps test setup out of the production build pipeline. The `@` alias and
// the React plugin mirror vite.config.js so JSX + @/ imports resolve in tests.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: false,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      exclude: [
        "node_modules/**",
        "src/components/ui/**",
        "src/api/**",
        "**/__tests__/**",
      ],
    },
  },
});