import type { Meta, StoryObj } from "@storybook/react-vite"
import { SPINNER_LABEL } from "../stories/fixtures"
import { Spinner } from "."

const meta = {
    title: "Data/Spinner",
    component: Spinner,
    tags: ["autodocs"],
    args: { label: SPINNER_LABEL },
} satisfies Meta<typeof Spinner>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
