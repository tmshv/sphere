import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "../test-utils"
import { StatusbarPopover } from "./StatusbarPopover"

describe("StatusbarPopover", () => {
    it("renders children when open", () => {
        render(
            <StatusbarPopover open anchor={createRef<HTMLElement>()} onClose={vi.fn()}>
                <span>Content</span>
            </StatusbarPopover>,
        )
        expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("renders in the dark scheme whatever the app theme", () => {
        render(
            <StatusbarPopover open anchor={createRef<HTMLElement>()} onClose={vi.fn()}>
                <span>Content</span>
            </StatusbarPopover>,
        )
        expect(screen.getByText("Content").closest('[data-theme="dark"]')).not.toBeNull()
    })
})
