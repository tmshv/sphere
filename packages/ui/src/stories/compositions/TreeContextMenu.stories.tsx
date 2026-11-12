import type { Meta, StoryObj } from "@storybook/react-vite"
import { type MouseEvent, useEffect, useRef, useState } from "react"
import { ContextMenu, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "../../ContextMenu"
import { CONTEXT_MENU_ITEMS, MENU_LABEL } from "../fixtures"
import { MENU_ANCHOR_ROW_TEXT, MENU_ROW_OFFSET, TREE_ROW_SELECTOR } from "../layout"
import { AppWindow } from "./AppWindow"

const { zoom, edit, remove, rename } = CONTEXT_MENU_ITEMS

type Position = [number, number]

const ORIGIN: Position = [0, 0]

function findRowPosition(frame: HTMLElement): Position | null {
    const row = Array.from(frame.querySelectorAll(TREE_ROW_SELECTOR)).find(item =>
        item.textContent?.includes(MENU_ANCHOR_ROW_TEXT),
    )
    if (!row) {
        return null
    }
    const rect = row.getBoundingClientRect()
    return [rect.left + MENU_ROW_OFFSET, rect.top + rect.height / 2]
}

/** The window with the menu open over a tree row; a right-click on any row reopens it there. */
function TreeContextMenuDemo() {
    const frame = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState<Position | null>(null)
    const [opened, setOpened] = useState(true)

    // The tree measures itself after mount, so wait for the row to exist.
    useEffect(() => {
        const element = frame.current
        if (!element) {
            return
        }
        const observer = new MutationObserver(() => {
            const next = findRowPosition(element)
            if (next) {
                setPosition(next)
                observer.disconnect()
            }
        })
        observer.observe(element, { childList: true, subtree: true })
        const initial = findRowPosition(element)
        if (initial) {
            setPosition(initial)
            observer.disconnect()
        }
        return () => observer.disconnect()
    }, [])

    function handleContextMenu(event: MouseEvent) {
        event.preventDefault()
        setPosition([event.clientX, event.clientY])
        setOpened(true)
    }

    return (
        <div ref={frame} onContextMenu={handleContextMenu}>
            <AppWindow />
            <ContextMenu
                opened={opened && position !== null}
                position={position ?? ORIGIN}
                onClose={() => setOpened(false)}
            >
                <ContextMenuLabel>{MENU_LABEL}</ContextMenuLabel>
                <ContextMenuItem icon={zoom.icon} shortcut={zoom.shortcut} onClick={() => setOpened(false)}>
                    {zoom.label}
                </ContextMenuItem>
                <ContextMenuItem icon={edit.icon} shortcut={edit.shortcut} onClick={() => setOpened(false)}>
                    {edit.label}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setOpened(false)}>{rename.label}</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem icon={remove.icon} onClick={() => setOpened(false)}>
                    {remove.label}
                </ContextMenuItem>
            </ContextMenu>
        </div>
    )
}

const meta = {
    title: "Compositions/TreeContextMenu",
    component: TreeContextMenuDemo,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TreeContextMenuDemo>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
