import { page, userEvent } from "vitest/browser"
import { visualCases } from "../visual/visualCases"
import { SliderField } from "."

const noop = () => {}
const MIN = 0
const MAX = 100
const MID = 50
const STEP = 5

visualCases("SliderField", {
    min: { render: () => <SliderField label="Opacity" value={MIN} min={MIN} max={MAX} onChange={noop} /> },
    mid: { render: () => <SliderField label="Opacity" value={MID} min={MIN} max={MAX} step={STEP} onChange={noop} /> },
    max: { render: () => <SliderField label="Opacity" value={MAX} min={MIN} max={MAX} onChange={noop} /> },
    "thumb-hover": {
        render: () => <SliderField label="Opacity" value={MID} min={MIN} max={MAX} onChange={noop} />,
        interact: () => userEvent.hover(page.getByRole("slider")),
    },
})
