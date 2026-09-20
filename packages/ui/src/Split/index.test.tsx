import { createRef } from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "../test-utils"
import { SplitPane, SplitView, type SplitViewHandle } from "."

describe("SplitView", () => {
    it("renders the children of every pane", () => {
        render(
            <SplitView vertical>
                <SplitPane>
                    <div>top</div>
                </SplitPane>
                <SplitPane>
                    <div>bottom</div>
                </SplitPane>
            </SplitView>,
        )

        expect(screen.getByText("top")).toBeInTheDocument()
        expect(screen.getByText("bottom")).toBeInTheDocument()
    })

    it("puts its className on the root element", () => {
        const { container } = render(
            <SplitView className={"probe"}>
                <SplitPane>
                    <div>only</div>
                </SplitPane>
            </SplitView>,
        )

        expect(container.querySelector(".probe")).not.toBeNull()
    })

    it("exposes resize and reset through its ref", () => {
        const ref = createRef<SplitViewHandle>()
        render(
            <SplitView ref={ref}>
                <SplitPane>
                    <div>only</div>
                </SplitPane>
            </SplitView>,
        )

        expect(typeof ref.current?.resize).toBe("function")
        expect(typeof ref.current?.reset).toBe("function")
    })
})

describe("SplitPane", () => {
    it("renders nothing when given no children", () => {
        render(
            <SplitView>
                <SplitPane>
                    <div>content</div>
                </SplitPane>
                <SplitPane minSize={0}>{null}</SplitPane>
            </SplitView>,
        )

        expect(screen.getByText("content")).toBeInTheDocument()
    })

    // allotment recognises a pane by checking `displayName === "Allotment.Pane"`
    // on the child element's type. If SplitPane ever goes back to wrapping
    // Allotment.Pane instead of being it, that check fails: every pane falls
    // into allotment's "not a pane" branch, which both discards minSize/
    // maxSize/preferredSize/priority/visible AND wraps the pane's own
    // split-view-view div in a second, unregistered one — doubling the
    // count of `.split-view-view` elements and collapsing content to zero
    // size. This test fails loudly on that regression instead of only on
    // pane geometry, which happy-dom cannot observe.
    it("registers each pane as exactly one split-view-view element", () => {
        const { container } = render(
            <SplitView vertical>
                <SplitPane>
                    <div>first</div>
                </SplitPane>
                <SplitPane>
                    <div>second</div>
                </SplitPane>
                <SplitPane>
                    <div>third</div>
                </SplitPane>
            </SplitView>,
        )

        const panes = container.querySelectorAll(".split-view-view")
        expect(panes).toHaveLength(3)

        for (const text of ["first", "second", "third"]) {
            const content = screen.getByText(text)
            expect(content.parentElement?.classList.contains("split-view-view")).toBe(true)
        }
    })
})
