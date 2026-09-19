import { render, screen } from "@/test-utils"
import { Accordion } from "@mantine/core"
import { describe, expect, it } from "vitest"
import { StyledAccordion } from "./StyledAccordion"

function renderAccordion() {
    return render(
        <StyledAccordion value={["outline", "details"]} onChange={() => {}}>
            <Accordion.Item value={"outline"}>
                <Accordion.Control>Outline</Accordion.Control>
                <Accordion.Panel>
                    <div>outline body</div>
                </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value={"details"}>
                <Accordion.Control>Details</Accordion.Control>
                <Accordion.Panel>
                    <div>details body</div>
                </Accordion.Panel>
            </Accordion.Item>
        </StyledAccordion>,
    )
}

function panelBodyOf(text: string) {
    const body = screen.getByText(text).parentElement
    if (!body) {
        throw new Error(`panel body of "${text}" not found`)
    }
    return body
}

describe("StyledAccordion", () => {
    it("fills the space it is given without overflowing it", () => {
        const { container } = renderAccordion()
        const root = container.firstElementChild
        if (!root) {
            throw new Error("accordion root not found")
        }
        const style = window.getComputedStyle(root)

        expect(style.display).toBe("flex")
        expect(style.flexDirection).toBe("column")
        expect(Number.parseFloat(style.minHeight)).toBe(0)
        expect(style.overflow).toBe("hidden")
    })

    it("hands its height down to every panel body instead of scrolling them itself", () => {
        renderAccordion()

        // The panel body decides what scrolls — a PanelBody keeps its header
        // fixed and scrolls only the part below it.
        for (const body of [panelBodyOf("outline body"), panelBodyOf("details body")]) {
            const style = window.getComputedStyle(body)
            expect(style.display).toBe("flex")
            expect(style.flexDirection).toBe("column")
            expect(Number.parseFloat(style.minHeight)).toBe(0)
            expect(style.overflow).toBe("hidden")
        }
    })

    it("lets an item shrink below its content height so its body can scroll", () => {
        renderAccordion()
        const item = panelBodyOf("details body").closest("[data-accordion-item], .mantine-Accordion-item")
        if (!item) {
            throw new Error("accordion item not found")
        }
        const style = window.getComputedStyle(item)

        expect(style.display).toBe("flex")
        expect(style.flexDirection).toBe("column")
        expect(Number.parseFloat(style.minHeight)).toBe(0)
    })

    it("keeps the control at full height while the body shrinks", () => {
        renderAccordion()
        const control = screen.getByRole("button", { name: "Details" })
        expect(window.getComputedStyle(control).flexShrink).toBe("0")
    })
})
