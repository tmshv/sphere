import userEvent from "@testing-library/user-event"
import { act } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { declaredStyle, fireEvent, render, screen, startingStyle } from "../test-utils"
import { Badge, Skeleton, Tooltip } from "."

const OPEN_DELAY_MS = 150

describe("Badge", () => {
    it("renders its text and title", () => {
        render(
            <Badge size="xs" variant="light" title="Type">
                string
            </Badge>,
        )
        expect(screen.getByText("string")).toBeInTheDocument()
        expect(screen.getByTitle("Type")).toBeInTheDocument()
    })

    it("applies size, variant and extra class", () => {
        render(
            <Badge size="sm" variant="filled" className="extra">
                badge
            </Badge>,
        )
        const root = screen.getByText("badge").parentElement
        expect(root?.className).toContain("sizeSm")
        expect(root?.className).toContain("filled")
        expect(root).toHaveClass("extra")
    })

    it("declares the tooltip radius and the outline colours from tokens", () => {
        render(
            <Badge size="sm" variant="outline">
                link
            </Badge>,
        )
        const root = screen.getByText("link").parentElement
        if (!root) throw new Error("badge root missing")
        expect(declaredStyle(root, "border-radius")).toBe("var(--sphere-radius-tooltip)")
        expect(declaredStyle(root, "color")).toBe("var(--sphere-color-label-secondary)")
        expect(declaredStyle(root, "border-color")).toBe("var(--sphere-color-separator)")
    })

    it("is 10px regular text that keeps the case of its data", () => {
        render(
            <Badge size="xs" variant="light">
                /a/Path.png
            </Badge>,
        )
        const root = screen.getByText("/a/Path.png").parentElement
        if (!root) throw new Error("badge root missing")
        expect(declaredStyle(root, "--badge-font-size")).toBe("var(--sphere-font-size-mini)")
        expect(declaredStyle(root, "font-weight")).toBe("var(--sphere-font-weight-regular)")
        expect(declaredStyle(root, "text-transform")).toBe("")
    })

    it("fills the light badge with its own badge role", () => {
        render(
            <Badge size="xs" variant="light">
                string
            </Badge>,
        )
        const root = screen.getByText("string").parentElement
        if (!root) throw new Error("badge root missing")
        expect(declaredStyle(root, "background")).toBe("var(--sphere-color-badge)")
        expect(declaredStyle(root, "color")).toBe("var(--sphere-color-label)")
    })
})

describe("Skeleton", () => {
    it("sizes itself from props", () => {
        const { container } = render(<Skeleton height={16} width={120} />)
        expect(container.firstElementChild).toHaveStyle({ height: "16px", width: "120px" })
    })

    it("fills the width by default", () => {
        const { container } = render(<Skeleton height={16} />)
        expect(container.firstElementChild).toHaveStyle({ width: "100%" })
    })
})

describe("Tooltip", () => {
    it("shows its label after the open delay", async () => {
        const user = userEvent.setup()
        render(
            <Tooltip label="Copy" delay={OPEN_DELAY_MS}>
                <button type="button">Target</button>
            </Tooltip>,
        )

        await user.hover(screen.getByRole("button", { name: "Target" }))
        expect(screen.queryByText("Copy")).not.toBeInTheDocument()

        expect(await screen.findByText("Copy")).toBeInTheDocument()
    })

    it("exposes the popup with role tooltip", async () => {
        const user = userEvent.setup()
        render(
            <Tooltip label="Copy" delay={0}>
                <button type="button">Target</button>
            </Tooltip>,
        )

        await user.hover(screen.getByRole("button", { name: "Target" }))

        expect(await screen.findByRole("tooltip")).toHaveTextContent("Copy")
        // Base UI sets no aria-describedby on the trigger, as Mantine 5 did not either.
        expect(screen.getByRole("button", { name: "Target" })).not.toHaveAttribute("aria-describedby")
    })

    it("stays closed when disabled", async () => {
        const user = userEvent.setup()
        render(
            <Tooltip label="Copy" delay={0} disabled>
                <button type="button">Target</button>
            </Tooltip>,
        )

        await user.hover(screen.getByRole("button", { name: "Target" }))
        await new Promise(resolve => setTimeout(resolve, OPEN_DELAY_MS))

        expect(screen.queryByText("Copy")).not.toBeInTheDocument()
    })
})

// A moment well inside the desktop tooltip delay (700ms), and the rest of it.
const INSIDE_DESKTOP_DELAY_MS = 350
const PAST_DESKTOP_DELAY_MS = 400

describe("Tooltip desktop look", () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it("waits the desktop tooltip delay by default", async () => {
        vi.useFakeTimers()
        render(
            <Tooltip label="Copy">
                <button type="button">Target</button>
            </Tooltip>,
        )

        fireEvent.pointerEnter(screen.getByRole("button", { name: "Target" }))
        fireEvent.mouseEnter(screen.getByRole("button", { name: "Target" }))
        fireEvent.mouseMove(screen.getByRole("button", { name: "Target" }))
        await act(() => vi.advanceTimersByTimeAsync(INSIDE_DESKTOP_DELAY_MS))
        expect(screen.queryByText("Copy")).not.toBeInTheDocument()

        await act(() => vi.advanceTimersByTimeAsync(PAST_DESKTOP_DELAY_MS))
        expect(screen.getByText("Copy")).toBeInTheDocument()
    })

    it("is a small hairline-bordered tag with no arrow that appears instantly", async () => {
        const user = userEvent.setup()
        render(
            <Tooltip label="Copy" delay={0}>
                <button type="button">Target</button>
            </Tooltip>,
        )

        await user.hover(screen.getByRole("button", { name: "Target" }))
        const tooltip = await screen.findByRole("tooltip")

        expect(declaredStyle(tooltip, "background-color")).toBe("var(--sphere-color-tooltip)")
        expect(declaredStyle(tooltip, "color")).toBe("var(--sphere-color-tooltip-text)")
        expect(declaredStyle(tooltip, "border-radius")).toBe("var(--sphere-radius-tooltip)")
        expect(declaredStyle(tooltip, "font-size")).toBe("var(--sphere-font-size-small)")
        expect(declaredStyle(tooltip, "box-shadow")).toContain("var(--sphere-color-popup-border)")
        expect(startingStyle(tooltip, "opacity")).toBe("")
        expect(tooltip.children).toHaveLength(0)
    })
})
