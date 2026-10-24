import { visualCases } from "../visual/visualCases"
import { ColorField } from "."

const noop = () => {}

visualCases("ColorField", {
    light: { render: () => <ColorField label="Color" value="#fab005" onChange={noop} /> },
    dark: { render: () => <ColorField label="Color" value="#1a1b1e" onChange={noop} /> },
})
