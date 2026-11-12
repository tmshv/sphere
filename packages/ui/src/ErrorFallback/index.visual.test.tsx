import { visualCases } from "../visual/visualCases"
import { ErrorFallback } from "."
import { RootErrorFallback } from "./RootErrorFallback"

const noop = () => {}
const error = new Error("Failed to load source: unexpected end of file")
// A sidebar column narrower than the subject, so the message fills it and the buttons wrap; the fullscreen case
// keeps the whole subject and centres the message.
const SIDEBAR_WIDTH_PX = 180
const SIDEBAR_STYLE = { width: SIDEBAR_WIDTH_PX, height: "100%" }

visualCases("ErrorFallback", {
    sidebar: {
        render: () => (
            <div style={SIDEBAR_STYLE}>
                <ErrorFallback error={error} resetErrorBoundary={noop} variant="sidebar" />
            </div>
        ),
    },
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
