import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ERROR_MESSAGE } from "../stories/fixtures"
import { RootErrorFallback } from "./RootErrorFallback"

const meta = {
    title: "Containers/RootErrorFallback",
    component: RootErrorFallback,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    args: { error: new Error(ERROR_MESSAGE), resetErrorBoundary: fn() },
} satisfies Meta<typeof RootErrorFallback>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
