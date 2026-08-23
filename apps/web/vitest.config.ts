import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: [
        "src/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/__tests__/**",
        "src/app/**",
        "src/**/*.d.ts",
        "src/**/*.spec.{ts,tsx}",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
