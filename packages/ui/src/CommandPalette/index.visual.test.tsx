import { IconMap } from "@sphere/icons"
import { page, userEvent } from "vitest/browser"
import { visualCases } from "../visual/visualCases"
import { type Command, CommandPalette } from "."

const noop = () => {}
const ICON_SIZE = 18
const SHORTCUT = "/"
const PLACEHOLDER = "Search commands..."
const EMPTY_MESSAGE = "Nothing found"

const COMMANDS: ReadonlyArray<Command> = [
    {
        id: "open",
        title: "Open file",
        description: "Load a source",
        icon: <IconMap size={ICON_SIZE} />,
        onTrigger: noop,
    },
    { id: "zen", title: "Toggle zen mode", onTrigger: noop },
    { id: "zoom", title: "Zoom to source", description: "Fit the map", onTrigger: noop },
]

function palette() {
    return (
        <CommandPalette commands={COMMANDS} shortcut={SHORTCUT} placeholder={PLACEHOLDER} emptyMessage={EMPTY_MESSAGE}>
            <div>App</div>
        </CommandPalette>
    )
}

async function openPalette() {
    await userEvent.keyboard(SHORTCUT)
    await expect.element(page.getByPlaceholder(PLACEHOLDER)).toBeVisible()
}

visualCases("CommandPalette", {
    "open-empty": { render: palette, interact: openPalette, target: "page" },
    filtered: {
        render: palette,
        interact: async () => {
            await openPalette()
            await userEvent.keyboard("zo")
            await expect.element(page.getByText("Zoom to source")).toBeVisible()
        },
        target: "page",
    },
    "nothing-found": {
        render: palette,
        interact: async () => {
            await openPalette()
            await userEvent.keyboard("zzzz")
            await expect.element(page.getByText(EMPTY_MESSAGE)).toBeVisible()
        },
        target: "page",
    },
})
