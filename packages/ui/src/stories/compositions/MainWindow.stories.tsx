import type { Meta, StoryObj } from "@storybook/react-vite"
import { AppWindow } from "./AppWindow"

const meta = {
    title: "Compositions/MainWindow",
    component: AppWindow,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    args: { sidebar: true },
    // The window keeps its own sidebar state, so a changed control remounts it.
    render: args => <AppWindow key={String(args.sidebar)} {...args} />,
} satisfies Meta<typeof AppWindow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The sidebar hidden with the statusbar toggle: the map takes the whole window. */
export const SidebarHidden: Story = { args: { sidebar: false } }
