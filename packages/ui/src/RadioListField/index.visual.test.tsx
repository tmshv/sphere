import { visualCases } from "../visual/visualCases"
import { RadioListField } from "."

const noop = () => {}
const OPTIONS = [
    { value: "mapterhorn", label: "Mapterhorn" },
    { value: "dem", label: "dem.mbtiles" },
    { value: "other", label: "Other source" },
]

visualCases("RadioListField", {
    selected: { render: () => <RadioListField label="Terrain source" value="dem" options={OPTIONS} onChange={noop} /> },
    "none-selected": {
        render: () => <RadioListField label="Terrain source" value={undefined} options={OPTIONS} onChange={noop} />,
    },
})
