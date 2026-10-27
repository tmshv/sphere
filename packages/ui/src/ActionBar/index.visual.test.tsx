import { IconCopy, IconPlus, IconTrash } from "@sphere/icons"
import { page, userEvent } from "vitest/browser"
import { visualCases } from "../visual/visualCases"
import { ActionBar } from "."

const noop = () => {}

const ITEMS = [
    { name: "add", label: "Add", icon: IconPlus },
    { name: "copy", label: "Copy", icon: IconCopy },
    null,
    { name: "delete", label: "Delete", icon: IconTrash, color: "red" },
]

visualCases("ActionBar", {
    separator: { render: () => <ActionBar items={ITEMS} onClick={noop} /> },
    padded: { render: () => <ActionBar items={ITEMS} onClick={noop} padded /> },
    disabled: {
        render: () => (
            <ActionBar
                items={[
                    { name: "add", label: "Add", icon: IconPlus },
                    { name: "copy", label: "Copy", icon: IconCopy, disabled: true },
                    null,
                    { name: "delete", label: "Delete", icon: IconTrash, color: "red" },
                ]}
                onClick={noop}
            />
        ),
    },
    hover: {
        render: () => <ActionBar items={ITEMS} onClick={noop} />,
        interact: () => userEvent.hover(page.getByRole("button", { name: "Add" })),
    },
})
