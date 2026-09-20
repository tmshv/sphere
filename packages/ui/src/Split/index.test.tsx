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
                <SplitPane minSize={0} />
            </SplitView>,
        )

        expect(screen.getByText("content")).toBeInTheDocument()
    })
})
