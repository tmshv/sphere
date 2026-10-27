import { IconX } from "@tabler/icons-react"
import { page } from "vitest/browser"
import { focusWithKeyboard, visualCases } from "../visual/visualCases"
import { TextField } from "."

const noop = () => {}
const ICON_SIZE = 12

visualCases("TextField", {
    empty: { render: () => <TextField label="URL" value="" onChange={noop} placeholder="https://..." /> },
    filled: { render: () => <TextField label="Name" value="Roads" onChange={noop} /> },
    focused: {
        render: () => <TextField label="Name" value="Roads" onChange={noop} />,
        interact: () => focusWithKeyboard(page.getByRole("textbox")),
    },
    error: { render: () => <TextField label="Filter" value="[bad" onChange={noop} error="Invalid expression" /> },
    required: { render: () => <TextField label="URL" value="" onChange={noop} required placeholder="https://..." /> },
    code: { render: () => <TextField label="Filter" value='["==", "kind", "road"]' onChange={noop} code /> },
    "right-section": {
        render: () => (
            <TextField label="Filter" value="kind" onChange={noop} rightSection={<IconX size={ICON_SIZE} />} />
        ),
    },
})
