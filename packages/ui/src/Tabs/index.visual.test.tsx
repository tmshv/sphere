import { IconDatabase, IconStack } from "@tabler/icons"
import { visualCases } from "../visual/visualCases"
import { type TabItem, Tabs } from "."

const noop = () => {}
const ICON_SIZE = 14

const ITEMS: ReadonlyArray<TabItem> = [
    { value: "sources", label: "Sources", icon: <IconDatabase size={ICON_SIZE} />, content: <div>Sources panel</div> },
    { value: "layers", label: "Layers", icon: <IconStack size={ICON_SIZE} />, content: <div>Layers panel</div> },
    { value: "styles", label: "Styles", disabled: true, content: <div>Styles panel</div> },
]

visualCases("Tabs", {
    "first-active": { render: () => <Tabs value="sources" onChange={noop} items={ITEMS} /> },
    "second-active": { render: () => <Tabs value="layers" onChange={noop} items={ITEMS} /> },
})
