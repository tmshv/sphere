import { page, userEvent } from "vitest/browser"
import { visualCases } from "../visual/visualCases"
import { Toolbar } from "."

visualCases("Toolbar", {
    vertical: { render: () => <Toolbar /> },
    horizontal: { render: () => <Toolbar horizontal /> },
    tooltip: {
        render: () => <Toolbar />,
        interact: async () => {
            await userEvent.hover(page.getByRole("button").first())
            await expect.element(page.getByText("Home")).toBeVisible()
        },
        target: "page",
    },
})
