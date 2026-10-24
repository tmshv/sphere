/// <reference types="vitest" />
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
    plugins: [react()],
    test: {
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        exclude: ["src/**/*.visual.test.tsx", "**/node_modules/**"],
        globals: true,
        environment: "happy-dom",
        setupFiles: ["./src/setupTests.ts"],
    },
})
