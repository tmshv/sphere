import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { TREE_EXPANDED_IDS, TREE_ITEMS, TREE_SELECTED_ID } from "../stories/fixtures"
import { treeStyle } from "../stories/layout"
import { Tree, type TreeProps } from "."

function TreeDemo({
    selectedId: initialSelected,
    expandedIds: initialExpanded,
    onSelect,
    onToggle,
    ...rest
}: TreeProps) {
    const [selectedId, setSelectedId] = useState(initialSelected)
    const [expandedIds, setExpandedIds] = useState(initialExpanded)

    return (
        <div style={treeStyle}>
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
