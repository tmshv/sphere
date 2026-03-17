import { fireEvent, render, screen } from "@/test-utils"
import { describe, expect, it, vi } from "vitest"
import { ErrorFallback } from "."

describe("ErrorFallback", () => {
    it("renders 'Something went wrong' heading", () => {
        render(<ErrorFallback error={new Error("test error")} resetErrorBoundary={vi.fn()} variant="fullscreen" />)
        expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    })

    it("renders error message from Error object", () => {
        render(
            <ErrorFallback
                error={new Error("specific error message")}
                resetErrorBoundary={vi.fn()}
                variant="fullscreen"
            />,
        )
        expect(screen.getByText("specific error message")).toBeInTheDocument()
    })

    it("renders string error directly", () => {
        render(<ErrorFallback error="string error message" resetErrorBoundary={vi.fn()} variant="fullscreen" />)
        expect(screen.getByText("string error message")).toBeInTheDocument()
    })

    it("calls resetErrorBoundary when Try Again button is clicked", () => {
        const resetErrorBoundary = vi.fn()
        render(<ErrorFallback error={new Error("test")} resetErrorBoundary={resetErrorBoundary} variant="fullscreen" />)
        fireEvent.click(screen.getByText("Try Again"))
        expect(resetErrorBoundary).toHaveBeenCalledTimes(1)
    })

    it("renders fullscreen variant without crashing", () => {
        const { container } = render(
            <ErrorFallback error={new Error("test")} resetErrorBoundary={vi.fn()} variant="fullscreen" />,
        )
        expect(container.firstChild).not.toBeNull()
    })

    it("renders sidebar variant without crashing", () => {
        const { container } = render(
            <ErrorFallback error={new Error("test")} resetErrorBoundary={vi.fn()} variant="sidebar" />,
        )
        expect(container.firstChild).not.toBeNull()
    })
})
