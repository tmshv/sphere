import { render, screen } from "../test-utils"
import { describe, expect, it } from "vitest"
import { Badge, Skeleton, unstyledButton } from "."

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
