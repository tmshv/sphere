import { page, userEvent } from "vitest/browser"
import { visualCases } from "../visual/visualCases"
import { SwitchField } from "."

const noop = () => {}

visualCases("SwitchField", {
    off: { render: () => <SwitchField label="Hillshade" checked={false} onChange={noop} /> },
    on: { render: () => <SwitchField label="Hillshade" checked onChange={noop} /> },
    focus: {
        render: () => <SwitchField label="Hillshade" checked onChange={noop} />,
        interact: async () => {
            await userEvent.tab()
            await expect.element(page.getByRole("switch")).toHaveFocus()
        },
    },
})
