import { page, userEvent } from "vitest/browser"
import { IMAGE_DATA_URI } from "../visual/fixtures"
import { visualCases } from "../visual/visualCases"
import { PropertiesViewer } from "."

// The copy button sits in a table cell at a fractional x. Mantine kept the tooltip's fractional position;
// Base UI rounds it to a whole pixel, so the box edge and the "Copy" text anti-alias differently (about 60
// pixels). Anti-aliasing only: the geometry, colours and text are unchanged.
const SUBPIXEL_POSITION_RATIO = 0.001

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
        allowedMismatchedPixelRatio: SUBPIXEL_POSITION_RATIO,
    },
    "copy-tooltip": {
        render: () => <PropertiesViewer properties={PROPERTIES} />,
        interact: async () => {
            await userEvent.hover(page.getByRole("button").first())
            await expect.element(page.getByText("Copy", { exact: true })).toBeVisible()
        },
        target: "page",
        allowedMismatchedPixelRatio: SUBPIXEL_POSITION_RATIO,
    },
})
