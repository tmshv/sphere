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

    clearScreen: false,
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
    envPrefix: ["VITE_", "TAURI_"],
    build: {
        target: ["es2022", "safari15"],
        minify: !process.env.TAURI_DEBUG ? true : false,
        sourcemap: !!process.env.TAURI_DEBUG,
        chunkSizeWarningLimit: 2048,
        rolldownOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                properties: resolve(__dirname, "properties.html"),
            },
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: "main",
                            test: /./,
                            minSize: 0,
                            priority: 0,
                        },
                        {
                            name: "properties",
                            test: /properties/,
                            minSize: 0,
                            priority: 1,
                        },
                    ],
                },
            },
        },
    },
})
