import type { Meta, StoryObj } from "@storybook/react-vite"
import { useEffect, useRef, useState } from "react"
import { fn } from "storybook/test"
import {
    TREE_BULB_ITEMS,
    TREE_BULB_SELECTED_ID,
    TREE_EXPANDED_IDS,
    TREE_ITEMS,
    TREE_SELECTED_ID,
} from "../stories/fixtures"
import { galleryStyle, treeStyle } from "../stories/layout"
import { Tree, type TreeProps } from "."

const TREE_ROLE = '[role="tree"]'

type TreeDemoProps = TreeProps & {
    /** Moves keyboard focus into the tree on mount, so the selection is drawn in the accent. */
    focused?: boolean
}

function TreeDemo({
    focused = false,
    selectedId: initialSelected,
    expandedIds: initialExpanded,
    onSelect,
    onToggle,
    ...rest
}: TreeDemoProps) {
    const frame = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (focused) {
            frame.current?.querySelector<HTMLElement>(TREE_ROLE)?.focus()
        }
    }, [focused])

    const [selectedId, setSelectedId] = useState(initialSelected)
    const [expandedIds, setExpandedIds] = useState(initialExpanded)

    return (
        <div ref={frame} style={treeStyle}>
            <Tree
                {...rest}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={id => {
                    setSelectedId(id)
                    onSelect(id)
                }}
                onToggle={(id, expanded) => {
                    setExpandedIds(current => (expanded ? [...current, id] : current.filter(item => item !== id)))
                    onToggle(id, expanded)
                }}
            />
        </div>
    )
}

const meta = {
    title: "Data/Tree",
    component: Tree,
    tags: ["autodocs"],
    args: {
        items: [...TREE_ITEMS],
        selectedId: TREE_SELECTED_ID,
        expandedIds: [...TREE_EXPANDED_IDS],
        onSelect: fn(),
        onToggle: fn(),
        onMove: fn(),
        canDrop: undefined,
    },
    render: args => <TreeDemo {...args} />,
} satisfies Meta<typeof Tree>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Collapsed: Story = { args: { expandedIds: [], selectedId: undefined } }

/** A selected row in a tree that has focus (accent fill, on-accent text) and in one that does not (grey fill). */
export const SelectionFocus: Story = {
    args: { items: [...TREE_BULB_ITEMS], expandedIds: [], selectedId: TREE_BULB_SELECTED_ID },
    render: args => (
        <div style={galleryStyle}>
            <TreeDemo {...args} focused />
            <TreeDemo {...args} />
        </div>
    ),
}
