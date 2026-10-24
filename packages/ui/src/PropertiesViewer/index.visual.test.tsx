import { page, userEvent } from "vitest/browser"
import { IMAGE_DATA_URI } from "../visual/fixtures"
import { visualCases } from "../visual/visualCases"
import { PropertiesViewer } from "."

const PROPERTIES = [
    { key: "name", value: "Berlin" },
    { key: "population", value: "3600000" },
]

visualCases("PropertiesViewer", {
    text: { render: () => <PropertiesViewer properties={PROPERTIES} /> },
    image: {
        render: () => <PropertiesViewer properties={[{ key: "photo", value: IMAGE_DATA_URI }]} checkUrls />,
    },
    "copy-button-hover": {
        render: () => <PropertiesViewer properties={PROPERTIES} />,
        interact: () => userEvent.hover(page.getByRole("button").first()),
    },
    "copy-tooltip": {
        render: () => <PropertiesViewer properties={PROPERTIES} />,
        interact: async () => {
            await userEvent.hover(page.getByRole("button").first())
            await expect.element(page.getByText("Copy", { exact: true })).toBeVisible()
        },
        target: "page",
    },
})
