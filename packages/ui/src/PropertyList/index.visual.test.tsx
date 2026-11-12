import type { ReactNode } from "react"
import { page, userEvent } from "vitest/browser"
import { IMAGE_DATA_URI } from "../visual/fixtures"
import { visualCases } from "../visual/visualCases"
import { PropertyList } from "."

const FRAME_WIDTH = 280
const PROPERTIES = [
    { name: "name", value: "Berlin" },
    { name: "population", value: 3600000 },
    { name: "description", value: "Capital and largest city of Germany, on the banks of the Spree" },
]

function Framed({ children }: { children: ReactNode }) {
    return <div style={{ width: FRAME_WIDTH }}>{children}</div>
}

visualCases("PropertyList", {
    text: {
        render: () => (
            <Framed>
                <PropertyList items={PROPERTIES} />
            </Framed>
        ),
    },
    "not-copyable": {
        render: () => (
            <Framed>
                <PropertyList items={PROPERTIES} copyable={false} />
            </Framed>
        ),
    },
    image: {
        render: () => (
            <Framed>
                <PropertyList items={[{ name: "photo", value: IMAGE_DATA_URI }]} checkUrls />
            </Framed>
        ),
    },
    "copy-tooltip": {
        render: () => (
            <Framed>
                <PropertyList items={PROPERTIES} />
            </Framed>
        ),
        interact: async () => {
            await userEvent.hover(page.getByRole("button").first())
            await expect.element(page.getByText("Copy", { exact: true })).toBeVisible()
        },
        target: "page",
    },
    "copy-menu": {
        render: () => (
            <Framed>
                <PropertyList items={PROPERTIES} />
            </Framed>
        ),
        interact: async () => {
            await userEvent.click(page.getByText("Berlin"), { button: "right" })
            await expect.element(page.getByRole("menuitem", { name: "Copy Value" })).toBeVisible()
        },
        target: "page",
    },
})
