import { visualCases } from "../visual/visualCases"
import { ErrorFallback } from "."
import { RootErrorFallback } from "./RootErrorFallback"

const noop = () => {}
const error = new Error("Failed to load source: unexpected end of file")

visualCases("ErrorFallback", {
    sidebar: { render: () => <ErrorFallback error={error} resetErrorBoundary={noop} variant="sidebar" /> },
    fullscreen: { render: () => <ErrorFallback error={error} resetErrorBoundary={noop} variant="fullscreen" /> },
})

visualCases("RootErrorFallback", {
    default: {
        render: () => (
            <div style={{ transform: "translateZ(0)", height: "100%" }}>
                <RootErrorFallback error={error} resetErrorBoundary={noop} />
            </div>
        ),
    },
})
