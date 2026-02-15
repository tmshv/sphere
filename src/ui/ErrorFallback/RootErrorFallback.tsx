import type { FallbackProps } from "react-error-boundary"

const rootStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100vw",
    height: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#c9cdd1",
    backgroundColor: "#1a1b1e",
}

const containerStyle: React.CSSProperties = {
    maxWidth: 420,
    textAlign: "center",
}

const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
}

const messageStyle: React.CSSProperties = {
    fontSize: 13,
    color: "#909296",
    marginBottom: 16,
    wordBreak: "break-word",
}

const buttonStyle: React.CSSProperties = {
    padding: "6px 16px",
    fontSize: 13,
    border: "1px solid #373a40",
    borderRadius: 4,
    background: "transparent",
    color: "#c9cdd1",
    cursor: "pointer",
}

export function RootErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div style={rootStyle}>
            <div style={containerStyle}>
                <div style={titleStyle}>Something went wrong</div>
                <div style={messageStyle}>{error instanceof Error ? error.message : String(error)}</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button style={buttonStyle} onClick={resetErrorBoundary}>
                        Try Again
                    </button>
                    <button style={buttonStyle} onClick={() => window.location.reload()}>
                        Reload App
                    </button>
                </div>
            </div>
        </div>
    )
}
