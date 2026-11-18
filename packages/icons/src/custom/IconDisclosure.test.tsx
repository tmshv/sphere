// @vitest-environment happy-dom
import { render } from "@testing-library/react"
import { createRef } from "react"
import type { IconComponent } from "../tabler"
import { IconDisclosure } from "./IconDisclosure"

describe("IconDisclosure", () => {
    it("is assignable to IconComponent", () => {
        const component: IconComponent = IconDisclosure

        expect(component).toBe(IconDisclosure)
    })

    it("passes extra props through to the svg", () => {
        const { getByTestId } = render(<IconDisclosure data-testid="probe" aria-label="open" />)

        expect(getByTestId("probe").tagName.toLowerCase()).toBe("svg")
        expect(getByTestId("probe").getAttribute("aria-label")).toBe("open")
    })

    it("forwards its ref to the svg element", () => {
        const ref = createRef<SVGSVGElement>()
        render(<IconDisclosure ref={ref} />)

        expect(ref.current?.tagName.toLowerCase()).toBe("svg")
    })

    it("renders a title child", () => {
        const { container } = render(<IconDisclosure title="Expand" />)

        expect(container.querySelector("title")?.textContent).toBe("Expand")
    })
})
