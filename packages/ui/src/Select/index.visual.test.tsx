import { IconLine, IconPoint, IconPolygon } from "@sphere/icons"
import { page, userEvent } from "vitest/browser"
import { pressAndHold, releasePress, visualCases } from "../visual/visualCases"
import { SegmentedControl } from "./SegmentedControl"
import { Select } from "./Select"

const noop = () => {}
const OPTIONS = ["Apple", "Banana", "Cherry"]
const LABELLED_OPTIONS = [
    { value: "x", label: "Longitude" },
    { value: "y", label: "Latitude" },
]

async function openSelect() {
    await userEvent.click(page.getByRole("combobox"))
    await expect.element(page.getByRole("option", { name: "Apple" })).toBeVisible()
}

visualCases("Select", {
    "closed-empty": {
        render: () => <Select label="Column" value={null} options={OPTIONS} onChange={noop} placeholder="Pick one" />,
    },
    "closed-value": { render: () => <Select label="Column" value="Banana" options={OPTIONS} onChange={noop} /> },
    "closed-labelled-value": {
        render: () => <Select label="Axis" value="y" options={LABELLED_OPTIONS} onChange={noop} />,
    },
    open: {
        render: () => <Select label="Column" value={null} options={OPTIONS} onChange={noop} />,
        interact: openSelect,
        target: "page",
    },
    "open-with-value": {
        render: () => <Select label="Column" value="Banana" options={OPTIONS} onChange={noop} />,
        interact: openSelect,
        target: "page",
    },
    "searchable-filtered": {
        render: () => <Select label="Column" value={null} options={OPTIONS} onChange={noop} searchable />,
        interact: async () => {
            await userEvent.click(page.getByRole("combobox"))
            await userEvent.keyboard("an")
            await expect.element(page.getByRole("option", { name: "Banana" })).toBeVisible()
        },
        target: "page",
    },
    "option-hover": {
        render: () => <Select label="Column" value={null} options={OPTIONS} onChange={noop} />,
        interact: async () => {
            await openSelect()
            await userEvent.hover(page.getByRole("option", { name: "Banana" }))
        },
        target: "page",
    },
})

const SEGMENTS = [
    { value: "point", label: "Point" },
    { value: "wkt", label: "WKT" },
]

const GLYPH_SIZE = 16
const ICON_SEGMENTS = [
    { value: "point", label: "Point", icon: <IconPoint size={GLYPH_SIZE} /> },
    { value: "line", label: "Line", icon: <IconLine size={GLYPH_SIZE} /> },
    { value: "polygon", label: "Polygon", icon: <IconPolygon size={GLYPH_SIZE} /> },
]

visualCases("SegmentedControl", {
    "first-active": {
        render: () => <SegmentedControl label="Geometry" options={SEGMENTS} value="point" onChange={noop} />,
    },
    "second-active": {
        render: () => <SegmentedControl label="Geometry" options={SEGMENTS} value="wkt" onChange={noop} />,
    },
    hover: {
        render: () => <SegmentedControl label="Geometry" options={SEGMENTS} value="point" onChange={noop} />,
        interact: () => userEvent.hover(page.getByText("WKT")),
    },
    "icon-only": {
        render: () => <SegmentedControl label="Geometry" options={ICON_SEGMENTS} value="line" onChange={noop} />,
    },
    pressed: {
        render: () => <SegmentedControl label="Geometry" options={SEGMENTS} value="point" onChange={noop} />,
        interact: () => pressAndHold(page.getByText("WKT")),
        cleanup: releasePress,
    },
})
