import { forwardRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "../test-utils"
import { SectionStack, type SectionLayout } from "."

// The real allotment SplitView only commits visibility classes to the DOM
// after a genuine layout/ResizeObserver pass, which happy-dom never
// performs. This mock stands in for it so the `visible` prop SectionStack
// passes to the trailing spacer pane can be asserted directly, without
// depending on allotment's internal DOM structure or Split itself.
type MockSplitViewProps = {
    children: React.ReactNode
}

type MockSplitPaneProps = {
    visible?: boolean
    children: React.ReactNode
}

vi.mock("../Split", () => ({
    SplitView: forwardRef<unknown, MockSplitViewProps>(({ children }) => <div>{children}</div>),
    SplitPane: ({ visible, children }: MockSplitPaneProps) => (
        <div data-testid="pane" data-visible={visible === undefined ? "true" : String(visible)}>
            {children}
        </div>
    ),
}))

describe("SectionStack trailing spacer", () => {
    it("marks the spacer invisible when at least one section is open", () => {
        const sections: SectionLayout[] = [
            { name: "outline", open: true, size: null },
            { name: "details", open: false, size: null },
        ]
        render(
            <SectionStack sections={sections} onSectionsChange={() => {}}>
                <SectionStack.Section name={"outline"} title={"Outline"}>
                    <div>outline body</div>
                </SectionStack.Section>
                <SectionStack.Section name={"details"} title={"Details"}>
                    <div>details body</div>
                </SectionStack.Section>
            </SectionStack>,
        )

        const panes = screen.getAllByTestId("pane")
        const spacer = panes.at(-1)
        expect(spacer).toBeDefined()
        expect(spacer).toHaveAttribute("data-visible", "false")
    })

    it("marks the spacer visible when every section is closed", () => {
        const sections: SectionLayout[] = [
            { name: "outline", open: false, size: null },
            { name: "details", open: false, size: null },
        ]
        render(
            <SectionStack sections={sections} onSectionsChange={() => {}}>
                <SectionStack.Section name={"outline"} title={"Outline"}>
                    <div>outline body</div>
                </SectionStack.Section>
                <SectionStack.Section name={"details"} title={"Details"}>
                    <div>details body</div>
                </SectionStack.Section>
            </SectionStack>,
        )

        const panes = screen.getAllByTestId("pane")
        const spacer = panes.at(-1)
        expect(spacer).toBeDefined()
        expect(spacer).toHaveAttribute("data-visible", "true")
    })
})
