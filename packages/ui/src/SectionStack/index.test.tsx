import { useState } from "react"
import { describe, expect, it } from "vitest"
import { declaredStyle, expectDesktopInteraction, fireEvent, render, screen } from "../test-utils"
import { SECTION_HEADER_HEIGHT, SectionStack, type SectionLayout } from "."

function Stack({ initial }: { initial: SectionLayout[] }) {
    const [sections, setSections] = useState(initial)

    return (
        <SectionStack sections={sections} onSectionsChange={setSections}>
            <SectionStack.Section name={"outline"} title={"Outline"}>
                <div>outline body</div>
            </SectionStack.Section>
            <SectionStack.Section name={"details"} title={"Details"}>
                <div>details body</div>
            </SectionStack.Section>
        </SectionStack>
    )
}

// An unset padding computes to "" here rather than to a length.
function paddingPx(value: string) {
    return value === "" ? 0 : Number.parseFloat(value)
}

describe("SectionStack", () => {
    it("renders a header for every section", () => {
        render(
            <Stack
                initial={[
                    { name: "outline", open: true, size: null },
                    { name: "details", open: true, size: null },
                ]}
            />,
        )

        expect(screen.getByRole("button", { name: /Outline/ })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Details/ })).toBeInTheDocument()
    })

    it("renders the body of an open section and hides a closed one's body while keeping its header", () => {
        render(
            <Stack
                initial={[
                    { name: "outline", open: true, size: null },
                    { name: "details", open: false, size: null },
                ]}
            />,
        )

        expect(screen.getByText("outline body")).toBeInTheDocument()
        expect(screen.queryByText("details body")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Details/ })).toBeInTheDocument()
    })

    it("tracks aria-expanded with each section's open state", () => {
        render(
            <Stack
                initial={[
                    { name: "outline", open: true, size: null },
                    { name: "details", open: false, size: null },
                ]}
            />,
        )

        expect(screen.getByRole("button", { name: /Outline/ })).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByRole("button", { name: /Details/ })).toHaveAttribute("aria-expanded", "false")
    })

    it("renders each header as an edge-to-edge strip button, so its focus ring is drawn inside", () => {
        render(
            <Stack
                initial={[
                    { name: "outline", open: true, size: null },
                    { name: "details", open: false, size: null },
                ]}
            />,
        )

        expect(screen.getByRole("button", { name: /Outline/ })).toHaveAttribute("data-shape", "strip")
    })

    it("calls onSectionsChange with only the clicked section's open flipped", () => {
        const calls: SectionLayout[][] = []
        const initial: SectionLayout[] = [
            { name: "outline", open: true, size: 200 },
            { name: "details", open: false, size: null },
        ]
        render(
            <SectionStack sections={initial} onSectionsChange={next => calls.push(next)}>
                <SectionStack.Section name={"outline"} title={"Outline"}>
                    <div>outline body</div>
                </SectionStack.Section>
                <SectionStack.Section name={"details"} title={"Details"}>
                    <div>details body</div>
                </SectionStack.Section>
            </SectionStack>,
        )

        fireEvent.click(screen.getByRole("button", { name: /Details/ }))

        const call = calls.at(0)
        expect(call).toBeDefined()
        expect(call).toEqual([
            { name: "outline", open: true, size: 200 },
            { name: "details", open: true, size: null },
        ])
    })

    it("renders a child with no matching row as open by default", () => {
        render(
            <SectionStack sections={[]} onSectionsChange={() => {}}>
                <SectionStack.Section name={"outline"} title={"Outline"}>
                    <div>outline body</div>
                </SectionStack.Section>
            </SectionStack>,
        )

        expect(screen.getByRole("button", { name: /Outline/ })).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByText("outline body")).toBeInTheDocument()
    })

    it("ignores a row with no matching child for rendering but preserves it unchanged in onSectionsChange", () => {
        const calls: SectionLayout[][] = []
        const initial: SectionLayout[] = [
            { name: "outline", open: true, size: 150 },
            { name: "archived", open: false, size: 77 },
        ]
        render(
            <SectionStack sections={initial} onSectionsChange={next => calls.push(next)}>
                <SectionStack.Section name={"outline"} title={"Outline"}>
                    <div>outline body</div>
                </SectionStack.Section>
            </SectionStack>,
        )

        expect(screen.queryByText(/archived/i)).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: /Outline/ }))

        const call = calls.at(0)
        expect(call).toBeDefined()
        expect(call).toEqual([
            { name: "outline", open: false, size: 150 },
            { name: "archived", open: false, size: 77 },
        ])
    })

    it("leaves the inset either side of a section body to the child that scrolls", () => {
        render(
            <Stack
                initial={[
                    { name: "outline", open: true, size: null },
                    { name: "details", open: true, size: null },
                ]}
            />,
        )
        const body = screen.getByText("outline body").parentElement
        if (!body) {
            throw new Error("section body not found")
        }
        const style = window.getComputedStyle(body)

        // Padding here would hold the child's scrollport away from the section
        // edge, putting the overlay scrollbar macOS draws over the text.
        expect(paddingPx(style.paddingLeft)).toBe(0)
        expect(paddingPx(style.paddingRight)).toBe(0)
        // A spacing token, which happy-dom leaves unresolved.
        expect(declaredStyle(body, "padding-top")).toBe("var(--sphere-space-12)")
    })

    it("drops the vertical padding of a flush section body and keeps it for the others", () => {
        render(
            <SectionStack
                sections={[
                    { name: "outline", open: true, size: null },
                    { name: "details", open: true, size: null },
                ]}
                onSectionsChange={() => undefined}
            >
                <SectionStack.Section name={"outline"} title={"Outline"} flush>
                    <div>outline body</div>
                </SectionStack.Section>
                <SectionStack.Section name={"details"} title={"Details"}>
                    <div>details body</div>
                </SectionStack.Section>
            </SectionStack>,
        )
        const flushBody = screen.getByText("outline body").parentElement
        const paddedBody = screen.getByText("details body").parentElement
        if (!flushBody || !paddedBody) {
            throw new Error("section body not found")
        }

        const flushStyle = window.getComputedStyle(flushBody)

        expect(paddingPx(flushStyle.paddingTop)).toBe(0)
        expect(paddingPx(flushStyle.paddingBottom)).toBe(0)
        expect(declaredStyle(paddedBody, "padding-top")).toBe("var(--sphere-space-12)")
        expect(declaredStyle(paddedBody, "padding-bottom")).toBe("var(--sphere-space-12)")
    })
})

describe("SectionStack header height", () => {
    it("declares in CSS the same height as SECTION_HEADER_HEIGHT", () => {
        render(
            <SectionStack sections={[{ name: "outline", open: true, size: null }]} onSectionsChange={() => undefined}>
                <SectionStack.Section name={"outline"} title={"Outline"}>
                    <div>outline body</div>
                </SectionStack.Section>
            </SectionStack>,
        )
        const header = screen.getByRole("button", { name: /Outline/ })

        expect(declaredStyle(header, "--header-height")).toBe(`${SECTION_HEADER_HEIGHT}px`)
    })
})

describe("SectionStack header interaction", () => {
    it("gives the header the desktop interaction model", () => {
        render(<Stack initial={[{ name: "outline", open: true, size: null }]} />)
        expectDesktopInteraction(screen.getByRole("button", { name: /Outline/ }))
    })
})

describe("SectionStack header look", () => {
    it("is a 22px strip of small semibold uppercase secondary text with a separator on top", () => {
        render(<Stack initial={[{ name: "outline", open: true, size: null }]} />)
        const toggle = screen.getByRole("button", { name: /Outline/ })
        const header = toggle.parentElement
        if (!header) {
            throw new Error("header not found")
        }

        expect(declaredStyle(toggle, "--header-height")).toBe(`${SECTION_HEADER_HEIGHT}px`)
        expect(declaredStyle(header, "color")).toBe("var(--sphere-color-label-secondary)")
        expect(declaredStyle(header, "font-size")).toBe("var(--sphere-font-size-small)")
        expect(declaredStyle(header, "font-weight")).toBe("var(--sphere-font-weight-semibold)")
        expect(declaredStyle(header, "text-transform")).toBe("uppercase")
        expect(declaredStyle(header, "letter-spacing")).toBe("0.02em")
        expect(declaredStyle(header, "box-shadow")).toBe("inset 0 1px 0 var(--sphere-color-separator)")
    })
})
