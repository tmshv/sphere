import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { declaredStyle, render, screen } from "../test-utils"
import { Badge, Skeleton, Tooltip, unstyledButton } from "."

const OPEN_DELAY_MS = 150

describe("Badge", () => {
    it("renders its text and title", () => {
        render(
            <Badge size="xs" variant="light" radius="sm" title="Type">
                string
            </Badge>,
        )
        expect(screen.getByText("string")).toBeInTheDocument()
        expect(screen.getByTitle("Type")).toBeInTheDocument()
    })

    it("applies size, variant, radius and extra class", () => {
        render(
            <Badge size="sm" variant="filled" radius="xl" className="extra">
                badge
            </Badge>,
        )
        const root = screen.getByText("badge").parentElement
        expect(root?.className).toContain("sizeSm")
        expect(root?.className).toContain("filled")
        expect(root?.className).toContain("radiusXl")
        expect(root).toHaveClass("extra")
    })

    it("declares the xs radius and the outline colours from tokens", () => {
        render(
            <Badge size="sm" variant="outline" radius="xs">
                link
            </Badge>,
        )
        const root = screen.getByText("link").parentElement
        if (!root) throw new Error("badge root missing")
        expect(declaredStyle(root, "border-radius")).toBe("var(--sphere-radius-xs)")
        expect(declaredStyle(root, "color")).toBe("var(--sphere-color-badge-outline-dark)")
        expect(declaredStyle(root, "border-color")).toBe("var(--sphere-color-badge-outline-dark)")
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

describe("unstyledButton", () => {
    it("is a class name usable on a button", () => {
        render(
            <button type="button" className={unstyledButton}>
                press
            </button>,
        )
        expect(screen.getByRole("button", { name: "press" })).toHaveClass(unstyledButton)
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
