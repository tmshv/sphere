import userEvent from "@testing-library/user-event"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "../test-utils"
import { Popover } from "."

describe("Popover", () => {
    it("renders children when open", () => {
        render(
            <Popover open anchor={createRef<HTMLElement>()} onClose={vi.fn()}>
                <span>Content</span>
            </Popover>,
        )
        expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("renders nothing when closed", () => {
        render(
            <Popover open={false} anchor={createRef<HTMLElement>()} onClose={vi.fn()}>
                <span>Content</span>
            </Popover>,
        )
        expect(screen.queryByText("Content")).not.toBeInTheDocument()
    })

    it("calls onClose on Escape", async () => {
        const onClose = vi.fn()
        render(
            <Popover open anchor={createRef<HTMLElement>()} onClose={onClose}>
                <button type="button">Inside</button>
            </Popover>,
        )
        await userEvent.keyboard("{Escape}")
        expect(onClose).toHaveBeenCalledTimes(1)
    })
})
