import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { Button } from "../../Button"
import { Dialog } from "../../Dialog"
import { TextField } from "../../TextField"
import {
    COMPOSITION_DIALOG_FIELD_VALUE,
    DIALOG_CANCEL_LABEL,
    DIALOG_FIELD_LABEL,
    DIALOG_FIELD_PLACEHOLDER,
    DIALOG_SUBMIT_LABEL,
    DIALOG_TITLE,
} from "../fixtures"
import { AppWindow } from "./AppWindow"

function DialogOverWindow() {
    const [opened, setOpened] = useState(true)
    const [url, setUrl] = useState(COMPOSITION_DIALOG_FIELD_VALUE)

    return (
        <>
            <AppWindow />
            <Dialog
                opened={opened}
                onClose={() => setOpened(false)}
                title={DIALOG_TITLE}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setOpened(false)}>
                            {DIALOG_CANCEL_LABEL}
                        </Button>
                        <Button onClick={() => setOpened(false)}>{DIALOG_SUBMIT_LABEL}</Button>
                    </>
                }
            >
                <TextField
                    label={DIALOG_FIELD_LABEL}
                    placeholder={DIALOG_FIELD_PLACEHOLDER}
                    value={url}
                    onChange={setUrl}
                />
            </Dialog>
        </>
    )
}

const meta = {
    title: "Compositions/DialogOverWindow",
    component: DialogOverWindow,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DialogOverWindow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
