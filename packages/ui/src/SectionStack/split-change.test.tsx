import { forwardRef, useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "../test-utils"
import { SECTION_HEADER_HEIGHT, SectionStack, type SectionLayout } from "."

type OnChange = (sizes: number[]) => void

// Every onChange SectionStack has handed to SplitView, one per render.
const handed: OnChange[] = []

// allotment applies a pane's new maxSize in a layout effect and reports the
// resulting sizes right there, but only picks up a new onChange prop in a
// later effect. So the sizes after a toggle arrive through the onChange of the
// render before it. The mock keeps every handler so a test can do the same.
vi.mock("../Split", () => ({
    SplitView: forwardRef<unknown, { children: React.ReactNode; onChange?: OnChange }>(function SplitView({
        children,
        onChange,
    }) {
        if (onChange) {
            handed.push(onChange)
        }
        return <div>{children}</div>
    }),
    SplitPane: function SplitPane({ children }: { children: React.ReactNode }) {
        return <div>{children}</div>
    },
}))

const TOTAL_HEIGHT = 600
const SPACER = 0

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

function handedBeforeLast(): OnChange {
    const handler = handed.at(-2)
    if (handler === undefined) {
        throw new Error("SplitView was rendered fewer than two times")
    }
    return handler
}

describe("SectionStack with sizes reported through an earlier onChange", () => {
    const initial: SectionLayout[] = [
        { name: "outline", open: true, size: 400 },
        { name: "details", open: true, size: 200 },
    ]

    it("closes the first section on the first click", () => {
        handed.length = 0
        render(<Stack initial={initial} />)

        const header = screen.getByRole("button", { name: /Outline/ })
        fireEvent.click(header)
        act(() => handedBeforeLast()([SECTION_HEADER_HEIGHT, TOTAL_HEIGHT - SECTION_HEADER_HEIGHT, SPACER]))

        expect(header).toHaveAttribute("aria-expanded", "false")
    })

    it("closes the last section on the first click", () => {
        handed.length = 0
        render(<Stack initial={initial} />)

        const header = screen.getByRole("button", { name: /Details/ })
        fireEvent.click(header)
        act(() => handedBeforeLast()([TOTAL_HEIGHT - SECTION_HEADER_HEIGHT, SECTION_HEADER_HEIGHT, SPACER]))

        expect(header).toHaveAttribute("aria-expanded", "false")
    })
})
