import { IconFolder, IconMap } from "@sphere/icons"
import { page } from "vitest/browser"
import { focusWithKeyboard, visualCases } from "../visual/visualCases"
import { VisibilityToggle } from "../VisibilityToggle"
import { Tree, type TreeItem } from "."
import { COLLAPSE_LABEL } from "./TreeRow"

const noop = () => {}
const ICON_SIZE = 16
const LAYER_COLOR = "#e8590c"
const FOLDER_ID = "cadastre"
const SELECTED_ID = "parcels"
const FRAME_STYLE = { height: "100%", display: "flex" }

const mapIcon = <IconMap size={ICON_SIZE} />

// The selected row carries a layer-coloured bulb, which keeps its colour on the accent fill while the row's
// other glyphs and text turn on-accent. A lit plain bulb and an unlit one sit on the rows below for comparison.
const ITEMS: TreeItem[] = [
    {
        id: FOLDER_ID,
        label: "Cadastre",
        icon: <IconFolder size={ICON_SIZE} />,
        children: [
            {
                id: SELECTED_ID,
                label: "Cadastral parcels",
                icon: mapIcon,
                extra: <VisibilityToggle visible color={LAYER_COLOR} onChange={noop} />,
            },
            {
                id: "roads",
                label: "Road network",
                icon: mapIcon,
                extra: <VisibilityToggle visible onChange={noop} />,
            },
            {
                id: "buildings",
                label: "Buildings footprints",
                icon: mapIcon,
                extra: <VisibilityToggle visible={false} onChange={noop} />,
            },
        ],
    },
]

function Outline() {
    return (
        <div style={FRAME_STYLE}>
            <Tree
                items={ITEMS}
                selectedId={SELECTED_ID}
                expandedIds={[FOLDER_ID]}
                onSelect={noop}
                onToggle={noop}
                onMove={noop}
            />
        </div>
    )
}

async function waitForRows() {
    await expect.element(page.getByText("Cadastral parcels")).toBeVisible()
}

// The selection is drawn in the accent while focus is anywhere inside the tree (:focus-within), by mouse or keyboard.
async function focusTree() {
    const tree = page.getByRole("tree")
    tree.element().focus()
    await expect.poll(() => tree.element().matches(":focus-within")).toBe(true)
}

visualCases("Tree", {
    "selected-unfocused": {
        render: () => <Outline />,
        interact: waitForRows,
    },
    "selected-focused": {
        render: () => <Outline />,
        interact: async () => {
            await waitForRows()
            await focusTree()
        },
    },
    "chevron-focus-visible": {
        render: () => <Outline />,
        interact: async () => {
            await waitForRows()
            await focusWithKeyboard(page.getByRole("button", { name: COLLAPSE_LABEL }))
        },
    },
})
