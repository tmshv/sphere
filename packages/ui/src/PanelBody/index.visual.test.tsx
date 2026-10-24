import { visualCases } from "../visual/visualCases"
import { PanelBody } from "."

const LINES = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu"]

function Lines() {
    return (
        <div style={{ fontSize: 12 }}>
            {LINES.map(line => (
                <div key={line}>{line}</div>
            ))}
        </div>
    )
}

visualCases("PanelBody", {
    "with-header": {
        render: () => (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <PanelBody header={<div style={{ fontSize: 12, fontWeight: 600 }}>Header</div>}>
                    <Lines />
                </PanelBody>
            </div>
        ),
    },
    "without-header": {
        render: () => (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <PanelBody>
                    <Lines />
                </PanelBody>
            </div>
        ),
    },
})
