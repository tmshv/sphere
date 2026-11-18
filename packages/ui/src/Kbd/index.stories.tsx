import type { Meta, StoryObj } from "@storybook/react-vite"
import { galleryStyle } from "../stories/layout"
import { Kbd, KbdShortcut } from "."

const SINGLE_KEYS: ReadonlyArray<string> = ["⌘", "⇧", "⌥", "⌃", "↵", "Esc", "Tab", "K"]
const SHORTCUTS: ReadonlyArray<ReadonlyArray<string>> = [
    ["⌘", "K"],
    ["⌘", "⇧", "P"],
    ["Ctrl", "Shift", "E"],
    ["G", "G"],
]

const meta = {
    title: "Data/Kbd",
    component: Kbd,
    tags: ["autodocs"],
    args: { children: "K" },
    argTypes: {
        children: { control: "text" },
    },
} satisfies Meta<typeof Kbd>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Modifier symbols and named keys. */
export const Keys: Story = {
    render: () => (
        <div style={galleryStyle}>
            {SINGLE_KEYS.map(key => (
                <Kbd key={key}>{key}</Kbd>
            ))}
        </div>
    ),
}

/** Key combinations: the caps of one shortcut side by side. */
export const Shortcuts: Story = {
    render: () => (
        <div style={galleryStyle}>
            {SHORTCUTS.map(keys => (
                <KbdShortcut key={keys.join("+")} keys={keys} />
            ))}
        </div>
    ),
}
