/// <reference types="vitest" />
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
    plugins: [react()],
    test: {
        include: [
            "**/*.test.ts",
            "**/*.test.tsx",
        ],
        exclude: [
            "**/node_modules/**",
            "**/.worktrees/**",
        ],
        globals: true,
        environment: "happy-dom",
        setupFiles: ["./src/setupTests.ts"],
        coverage: {
            provider: "v8",
            thresholds: {
                lines: 50,
                functions: 50,
                branches: 40,
            },
        },
    },
})
