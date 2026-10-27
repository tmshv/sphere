import { page, userEvent } from "vitest/browser"
import { visualCases } from "../visual/visualCases"
import { SliderField } from "."

const noop = () => {}
const THUMB_SELECTOR = "[data-index]"

// Base UI hides its native range input, so hover the visible thumb that wraps it.
function thumbLocator() {
    const thumb = document.querySelector(THUMB_SELECTOR)
    if (!thumb) {
        throw new Error("slider thumb not found")
    }
    return page.elementLocator(thumb)
}
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
        interact: () => userEvent.hover(thumbLocator()),
    },
})
