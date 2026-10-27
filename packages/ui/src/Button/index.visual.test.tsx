import { IconPlus } from "@sphere/icons"
import { page, userEvent } from "vitest/browser"
import { focusWithKeyboard, visualCases } from "../visual/visualCases"
import { Button } from "./Button"
import { IconButton } from "./IconButton"

const noop = () => {}
const ICON_SIZE = 16

visualCases("Button", {
    primary: { render: () => <Button>Primary</Button> },
    secondary: { render: () => <Button variant="secondary">Secondary</Button> },
    disabled: { render: () => <Button disabled>Disabled</Button> },
    hover: {
        render: () => <Button>Hover</Button>,
        interact: () => userEvent.hover(page.getByRole("button")),
    },
    "focus-visible": {
        render: () => <Button>Focus</Button>,
        interact: () => focusWithKeyboard(page.getByRole("button")),
    },
})

const icon = <IconPlus size={ICON_SIZE} />

visualCases("IconButton", {
    sm: { render: () => <IconButton icon={icon} label="Add" onClick={noop} size="sm" /> },
    md: { render: () => <IconButton icon={icon} label="Add" onClick={noop} size="md" /> },
    "solid-active": {
        render: () => <IconButton icon={icon} label="Add" onClick={noop} active appearance="solid" />,
    },
    disabled: { render: () => <IconButton icon={icon} label="Add" onClick={noop} disabled /> },
})
