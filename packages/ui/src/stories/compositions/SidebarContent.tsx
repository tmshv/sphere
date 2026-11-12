import { IconStack } from "@sphere/icons"
import { type ReactNode, useState } from "react"
import { ActionBar } from "../../ActionBar"
import { SectionStack, type SectionLayout } from "../../SectionStack"
import { Sidebar } from "../../Sidebar"
import { Tabs, type TabItem } from "../../Tabs"
import { Tree, type TreeItem } from "../../Tree"
import { VisibilityToggle } from "../../VisibilityToggle"
import {
    glyph,
    INSPECTOR_SECTION,
    INSPECTOR_SECTION_TITLE,
    LAYER_FIXTURES,
    OUTLINE_SECTION,
    OUTLINE_SECTION_TITLE,
    SECTION_INSPECTOR_DEFAULT_SIZE,
    SECTION_INSPECTOR_MIN_SIZE,
    SECTION_OUTLINE_DEFAULT_SIZE,
    SECTION_OUTLINE_MIN_SIZE,
    SIDEBAR_TAB_LAYERS,
    SIDEBAR_TAB_SOURCES,
    SIDEBAR_TABS,
    SOURCES_ACTIONS,
    TREE_EXPANDED_IDS,
    TREE_ITEMS,
    TREE_SELECTED_ID,
} from "../fixtures"
import { LayerInspectorPanel } from "./LayerInspectorPanel"

const INITIAL_SECTIONS: SectionLayout[] = [
    { name: OUTLINE_SECTION, open: true, size: SECTION_OUTLINE_DEFAULT_SIZE },
    { name: INSPECTOR_SECTION, open: true, size: SECTION_INSPECTOR_DEFAULT_SIZE },
]

/** The tree rows with a visibility bulb each; the bulb of a hidden id is unlit. */
function withBulbs(
    items: ReadonlyArray<TreeItem>,
    hidden: ReadonlyArray<string>,
    toggle: (id: string) => void,
): TreeItem[] {
    return items.map(item => ({
        ...item,
        extra: (
            <VisibilityToggle
                visible={!hidden.includes(item.id)}
                color={LAYER_FIXTURES.find(layer => layer.id === item.id)?.color}
                onChange={() => toggle(item.id)}
            />
        ),
        children: item.children ? withBulbs(item.children, hidden, toggle) : undefined,
    }))
}

type OutlineProps = {
    items: ReadonlyArray<TreeItem>
    selectedId: string | undefined
    initialExpanded: ReadonlyArray<string>
    onSelect: (id: string | undefined) => void
    toggleBulb: (id: string) => void
    hidden: ReadonlyArray<string>
    actions: boolean
}

function Outline({ items, selectedId, initialExpanded, onSelect, toggleBulb, hidden, actions }: OutlineProps) {
    const [expanded, setExpanded] = useState<string[]>([...initialExpanded])
    const [sections, setSections] = useState(INITIAL_SECTIONS)

    return (
        <>
            {actions ? <ActionBar padded items={SOURCES_ACTIONS} onClick={() => undefined} /> : null}
            <SectionStack sections={sections} onSectionsChange={setSections}>
                <SectionStack.Section
                    name={OUTLINE_SECTION}
                    title={OUTLINE_SECTION_TITLE}
                    minContentSize={SECTION_OUTLINE_MIN_SIZE}
                    flush
                >
                    <Tree
                        items={withBulbs(items, hidden, toggleBulb)}
                        selectedId={selectedId}
                        expandedIds={expanded}
                        onSelect={onSelect}
                        onToggle={(id, open) =>
                            setExpanded(current => (open ? [...current, id] : current.filter(item => item !== id)))
                        }
                        onMove={() => undefined}
                    />
                </SectionStack.Section>
                <SectionStack.Section
                    name={INSPECTOR_SECTION}
                    title={INSPECTOR_SECTION_TITLE}
                    minContentSize={SECTION_INSPECTOR_MIN_SIZE}
                >
                    <LayerInspectorPanel />
                </SectionStack.Section>
            </SectionStack>
        </>
    )
}

const LAYER_ITEMS: ReadonlyArray<TreeItem> = LAYER_FIXTURES.map(layer => ({
    id: layer.id,
    label: layer.label,
    icon: glyph(IconStack),
}))
const LAYER_FIRST_ID = LAYER_ITEMS.at(0)?.id
const NO_EXPANDED: ReadonlyArray<string> = []

/** The left sidebar with Sources and Layers tabs, as the app composes it. All state is local. */
export function SidebarContent() {
    const [tab, setTab] = useState(SIDEBAR_TAB_SOURCES)
    const [sourceId, setSourceId] = useState<string | undefined>(TREE_SELECTED_ID)
    const [layerId, setLayerId] = useState<string | undefined>(LAYER_FIRST_ID)
    const [hidden, setHidden] = useState<string[]>(
        LAYER_FIXTURES.filter(layer => !layer.visible).map(layer => layer.id),
    )

    function toggleBulb(id: string) {
        setHidden(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]))
    }

    const content: Record<string, ReactNode> = {
        [SIDEBAR_TAB_SOURCES]: (
            <Outline
                actions
                items={TREE_ITEMS}
                selectedId={sourceId}
                initialExpanded={TREE_EXPANDED_IDS}
                onSelect={setSourceId}
                toggleBulb={toggleBulb}
                hidden={hidden}
            />
        ),
        [SIDEBAR_TAB_LAYERS]: (
            <Outline
                actions={false}
                items={LAYER_ITEMS}
                selectedId={layerId}
                initialExpanded={NO_EXPANDED}
                onSelect={setLayerId}
                toggleBulb={toggleBulb}
                hidden={hidden}
            />
        ),
    }

    const items: TabItem[] = SIDEBAR_TABS.map(item => ({ ...item, content: content[item.value] ?? null }))

    return (
        <Sidebar>
            <Tabs value={tab} onChange={setTab} items={items} />
        </Sidebar>
    )
}
