import "@/style.css"

import App from "@/components/App"
import logger from "@/logger"
import { SphereThemeProvider } from "@/components/SphereThemeProvider"
import { setupMaplibre } from "@/maplibre"
import { actions, store } from "@/store"
import { handleDragDrop, handleHotkey, handleTheme, handleVersion } from "@/tauri"
import { RootErrorFallback } from "@/ui/ErrorFallback/RootErrorFallback"
import React from "react"
import ReactDOM from "react-dom/client"
import { ErrorBoundary } from "react-error-boundary"
import { Provider } from "react-redux"
import { SourceType } from "./types"

async function main() {
    setupMaplibre()
    await handleDragDrop()
    await handleTheme()
    await handleVersion()
    await handleHotkey()

    store.dispatch(
        actions.source.addFromUrl({
            url: "file:///Users/tmshv/Workspace/designunit/sndl/20250416-10k.csv",
            type: SourceType.Geojson,
        }),
    )

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
        <React.StrictMode>
            <ErrorBoundary FallbackComponent={RootErrorFallback}>
                <Provider store={store}>
                    <SphereThemeProvider>
                        <App />
                    </SphereThemeProvider>
                </Provider>
            </ErrorBoundary>
        </React.StrictMode>,
    )
}

main().catch(err => logger.error(err))
