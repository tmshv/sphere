import { IconHome2 } from "@tabler/icons-react"
import { fireEvent, render, screen } from "../test-utils"
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest"
import { NavbarLink, Toolbar } from "."

const TOOLBAR_LINK_COUNT = 6

describe("NavbarLink", () => {
    it("calls onClick when clicked", () => {
        const onClick = vi.fn()
        render(<NavbarLink icon={IconHome2} label="Home" onClick={onClick} />)
        fireEvent.click(screen.getByRole("button"))
        expect(onClick).toHaveBeenCalledTimes(1)
    })
})

describe("Toolbar", () => {
    it("renders a button per link", () => {
        render(<Toolbar />)
        expect(screen.getAllByRole("button")).toHaveLength(TOOLBAR_LINK_COUNT)
    })
})
