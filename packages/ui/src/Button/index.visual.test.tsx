import { IconPlus } from "@sphere/icons"
import { page, userEvent } from "vitest/browser"
import { focusWithKeyboard, pressAndHold, releasePress, visualCases } from "../visual/visualCases"
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
    pressed: {
        render: () => <Button>Pressed</Button>,
        interact: () => pressAndHold(page.getByRole("button")),
        cleanup: releasePress,
    },
    "secondary-pressed": {
        render: () => <Button variant="secondary">Pressed</Button>,
        interact: () => pressAndHold(page.getByRole("button")),
        cleanup: releasePress,
    },
})

const icon = <IconPlus size={ICON_SIZE} />

visualCases("IconButton", {
    sm: { render: () => <IconButton icon={icon} label="Add" onClick={noop} size="sm" /> },
    md: { render: () => <IconButton icon={icon} label="Add" onClick={noop} size="md" /> },
    active: { render: () => <IconButton icon={icon} label="Add" onClick={noop} active /> },
    bordered: { render: () => <IconButton icon={icon} label="Add" onClick={noop} variant="bordered" /> },
    "bordered-active": {
        render: () => <IconButton icon={icon} label="Add" onClick={noop} active variant="bordered" />,
    },
    "disabled-active": { render: () => <IconButton icon={icon} label="Add" onClick={noop} disabled active /> },
    disabled: { render: () => <IconButton icon={icon} label="Add" onClick={noop} disabled /> },
    pressed: {
        render: () => <IconButton icon={icon} label="Add" onClick={noop} />,
        interact: () => pressAndHold(page.getByRole("button")),
        cleanup: releasePress,
    },
    "bordered-pressed": {
        render: () => <IconButton icon={icon} label="Add" onClick={noop} variant="bordered" />,
        interact: () => pressAndHold(page.getByRole("button")),
        cleanup: releasePress,
    },
    "focus-visible": {
        render: () => <IconButton icon={icon} label="Add" onClick={noop} />,
        interact: () => focusWithKeyboard(page.getByRole("button")),
    },
})
