/// <reference types="vitest" />

import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

const host = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
    plugins: [react()],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    // prevent vite from obscuring rust errors
    clearScreen: false,
    // tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: "ws",
                host,
                port: 1421,
            }
            : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
    // to make use of `TAURI_DEBUG` and other env variables
    // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
    envPrefix: ["VITE_", "TAURI_"],
    optimizeDeps: {
        esbuildOptions: {
            target: "es2022",
        },
    },
    build: {
        // Tauri supports es2021
        target: ["es2022", "safari15"],
        // don't minify for debug builds
        minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
        // produce sourcemaps for debug builds
        sourcemap: !!process.env.TAURI_DEBUG,

        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                properties: resolve(__dirname, "properties.html"),
            },
        },
    },
    test: {
        include: [
            "**/*.test.ts",
            "**/*.test.tsx",
        ],
        globals: true,
        environmentMatchGlobs: [
            ["**/*.test.tsx", "happy-dom"],
        ],
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
