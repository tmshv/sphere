import { useState } from "react"
import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "../test-utils"
import { SectionStack, type SectionLayout } from "."

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
})
