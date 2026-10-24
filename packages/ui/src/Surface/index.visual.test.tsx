import { visualCases } from "../visual/visualCases"
import { Surface } from "."

const PANEL_STYLE = { width: 200 }

visualCases("Surface", {
    default: { render: () => <Surface>Surface content</Surface> },
    styled: { render: () => <Surface style={PANEL_STYLE}>Surface content</Surface> },
})
