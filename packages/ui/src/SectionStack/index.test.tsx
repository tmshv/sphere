import { useState } from "react"
import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "../test-utils"
import { SectionStack } from "."

function Stack({ initial }: { initial: string[] }) {
    const [value, setValue] = useState(initial)

    return (
        <SectionStack value={value} onChange={setValue}>
            <SectionStack.Section value={"outline"} title={"Outline"}>
                <div>outline body</div>
            </SectionStack.Section>
            <SectionStack.Section value={"details"} title={"Details"}>
                <div>details body</div>
            </SectionStack.Section>
        </SectionStack>
    )
}

describe("SectionStack", () => {
    it("renders a header for every section", () => {
        render(<Stack initial={["outline", "details"]} />)

        expect(screen.getByRole("button", { name: /Outline/ })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Details/ })).toBeInTheDocument()
    })

    it("renders the body of an open section", () => {
        render(<Stack initial={["outline"]} />)

        expect(screen.getByText("outline body")).toBeInTheDocument()
    })

    it("hides the body of a closed section but keeps its header", () => {
        render(<Stack initial={["outline"]} />)

        expect(screen.queryByText("details body")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Details/ })).toBeInTheDocument()
    })

    it("marks open sections with aria-expanded", () => {
        render(<Stack initial={["outline"]} />)

        expect(screen.getByRole("button", { name: /Outline/ })).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByRole("button", { name: /Details/ })).toHaveAttribute("aria-expanded", "false")
    })

    it("closes an open section when its header is clicked", () => {
        render(<Stack initial={["outline", "details"]} />)

        fireEvent.click(screen.getByRole("button", { name: /Outline/ }))

        expect(screen.queryByText("outline body")).not.toBeInTheDocument()
        expect(screen.getByText("details body")).toBeInTheDocument()
    })

    it("opens a closed section when its header is clicked", () => {
        render(<Stack initial={[]} />)

        fireEvent.click(screen.getByRole("button", { name: /Details/ }))

        expect(screen.getByText("details body")).toBeInTheDocument()
    })

    it("reports the new open set through onChange", () => {
        const calls: string[][] = []
        render(
            <SectionStack value={["outline"]} onChange={next => calls.push(next)}>
                <SectionStack.Section value={"outline"} title={"Outline"}>
                    <div>outline body</div>
                </SectionStack.Section>
                <SectionStack.Section value={"details"} title={"Details"}>
                    <div>details body</div>
                </SectionStack.Section>
            </SectionStack>,
        )

        fireEvent.click(screen.getByRole("button", { name: /Details/ }))

        expect(calls.at(0)).toEqual(["outline", "details"])
    })
})
