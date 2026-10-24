import { render } from "../test-utils"
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { BarChart } from "./BarChart"

const DATA = [1, 4, 2, 8]

describe("BarChart", () => {
    it("renders a background and one bar per data point", () => {
        const { container } = render(<BarChart data={DATA} width={50} height={50} color="red" />)
        const svg = container.querySelector("svg")
        expect(svg).toHaveAttribute("width", "50")
        expect(svg).toHaveAttribute("aria-hidden", "true")
        expect(container.querySelectorAll("rect")).toHaveLength(DATA.length + 1)
    })

    it("renders nothing when narrower than 10px", () => {
        const { container } = render(<BarChart data={DATA} width={9} height={50} color="red" />)
        expect(container.querySelector("svg")).toBeNull()
    })
})
