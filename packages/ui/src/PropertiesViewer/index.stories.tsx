import type { Meta, StoryObj } from "@storybook/react-vite"
import { VIEWER_PROPERTIES, VIEWER_PROPERTIES_WITH_PHOTO } from "../stories/fixtures"
import { PropertiesViewer } from "."

const meta = {
    title: "Data/PropertiesViewer",
    component: PropertiesViewer,
    tags: ["autodocs"],
    args: { properties: [...VIEWER_PROPERTIES], checkUrls: false },
} satisfies Meta<typeof PropertiesViewer>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithImage: Story = { args: { properties: [...VIEWER_PROPERTIES_WITH_PHOTO], checkUrls: true } }
