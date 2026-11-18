import { useState } from "react"
import { ColorField } from "../../ColorField"
import { SegmentedControl, Select } from "../../Select"
import { SliderField } from "../../SliderField"
import { TextField } from "../../TextField"
import {
    BLEND_DEFAULT,
    BLEND_LABEL,
    BLEND_OPTIONS,
    COLOR_LABEL,
    COLOR_VALUE,
    SEGMENT_LABEL,
    SEGMENT_OPTIONS,
    SEGMENT_VALUE,
    SLIDER_LABEL,
    SLIDER_MAX,
    SLIDER_MIN,
    SLIDER_STEP,
    SLIDER_VALUE,
    TEXT_FIELD_LABEL,
    TEXT_FIELD_VALUE,
} from "../fixtures"
import { inspectorStyle } from "../layout"

/** The layer inspector: every field is live, so the form can be tried in place. */
export function LayerInspectorPanel() {
    const [blend, setBlend] = useState(BLEND_DEFAULT)
    const [opacity, setOpacity] = useState(SLIDER_VALUE)
    const [color, setColor] = useState(COLOR_VALUE)
    const [name, setName] = useState(TEXT_FIELD_VALUE)
    const [geometry, setGeometry] = useState(SEGMENT_VALUE)

    return (
        <div style={inspectorStyle}>
            <TextField label={TEXT_FIELD_LABEL} value={name} onChange={setName} />
            <SegmentedControl label={SEGMENT_LABEL} options={SEGMENT_OPTIONS} value={geometry} onChange={setGeometry} />
            <ColorField label={COLOR_LABEL} value={color} onChange={setColor} />
            <SliderField
                label={SLIDER_LABEL}
                value={opacity}
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={SLIDER_STEP}
                onChange={setOpacity}
            />
            <Select
                label={BLEND_LABEL}
                value={blend}
                options={[...BLEND_OPTIONS]}
                onChange={value => value !== null && setBlend(value)}
            />
        </div>
    )
}
