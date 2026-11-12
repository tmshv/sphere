import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Button } from "../Button"
import { TextField } from "../TextField"
import {
    DIALOG_CANCEL_LABEL,
    DIALOG_FIELD_LABEL,
    DIALOG_FIELD_PLACEHOLDER,
    DIALOG_NOTICE,
    DIALOG_SUBMIT_LABEL,
    DIALOG_TITLE,
} from "../stories/fixtures"
import { Dialog } from "."

const meta = {
    title: "Containers/Dialog",
    component: Dialog,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    args: {
        opened: true,
        title: DIALOG_TITLE,
        onClose: fn(),
        footer: <Button>{DIALOG_SUBMIT_LABEL}</Button>,
        children: (
            <TextField label={DIALOG_FIELD_LABEL} placeholder={DIALOG_FIELD_PLACEHOLDER} value="" onChange={fn()} />
        ),
    },
} satisfies Meta<typeof Dialog>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutFooter: Story = { args: { footer: undefined, children: DIALOG_NOTICE } }

// Buttons bottom-right, the primary button last.
export const WithActions: Story = {
    args: {
        footer: (
            <>
                <Button variant="secondary" onClick={fn()}>
                    {DIALOG_CANCEL_LABEL}
                </Button>
                <Button onClick={fn()}>{DIALOG_SUBMIT_LABEL}</Button>
            </>
        ),
    },
}
