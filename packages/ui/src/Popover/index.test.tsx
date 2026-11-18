import userEvent from "@testing-library/user-event"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "../test-utils"
import { Popover, PopoverSection } from "."

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

    it("renders its subtree in the dark scheme when dark", () => {
        render(
            <Popover open dark anchor={createRef<HTMLElement>()} onClose={vi.fn()}>
                <span>Content</span>
            </Popover>,
        )
        expect(screen.getByText("Content").closest('[data-theme="dark"]')).not.toBeNull()
    })

    it("follows the app scheme by default", () => {
        render(
            <Popover open anchor={createRef<HTMLElement>()} onClose={vi.fn()}>
                <span>Content</span>
            </Popover>,
        )
        expect(screen.getByText("Content").closest('[data-theme="dark"]')).toBeNull()
    })

    it("adds className to the popup", () => {
        render(
            <Popover open className="extra" anchor={createRef<HTMLElement>()} onClose={vi.fn()}>
                <span>Content</span>
            </Popover>,
        )
        expect(screen.getByText("Content").closest(".extra")).not.toBeNull()
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

describe("PopoverSection", () => {
    it("labels its content with the title as a heading", () => {
        render(
            <PopoverSection title="Hillshade">
                <span>Content</span>
            </PopoverSection>,
        )
        const section = screen.getByRole("region", { name: "Hillshade" })
        expect(section).toContainElement(screen.getByText("Content"))
        expect(screen.getByRole("heading", { name: "Hillshade" })).toBeInTheDocument()
    })
})
