import { IconMap } from "@tabler/icons"
import { page, userEvent } from "vitest/browser"
import { visualCases } from "../visual/visualCases"
import { Outline } from "."
import { OutlineItem } from "./OutlineItem"

const noop = () => {}
const ICON_SIZE = 14

const ITEMS = [
    { id: 1, label: "Cities", active: true },
    { id: 2, label: "Roads", active: false },
    { id: 3, label: "Rivers", active: false },
]

function renderItem(item: (typeof ITEMS)[number]) {
    return <OutlineItem label={item.label} active={item.active} icon={<IconMap size={ICON_SIZE} />} />
}

visualCases("Outline", {
    list: { render: () => <Outline items={ITEMS} onMove={noop} renderItem={renderItem} /> },
})

visualCases("OutlineItem", {
    inactive: { render: () => <OutlineItem label="Roads" /> },
    active: { render: () => <OutlineItem label="Cities" active /> },
    "with-icon-and-extra": {
        render: () => <OutlineItem label="Rivers" icon={<IconMap size={ICON_SIZE} />} extra={<span>3</span>} />,
    },
    "inactive-hover": {
        render: () => <OutlineItem label="Roads" />,
        interact: () => userEvent.hover(page.getByRole("button", { name: "Roads" })),
    },
    "active-hover": {
        render: () => <OutlineItem label="Cities" active />,
        interact: () => userEvent.hover(page.getByRole("button", { name: "Cities" })),
    },
})
