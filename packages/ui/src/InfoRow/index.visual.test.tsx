import { visualCases } from "../visual/visualCases"
import { InfoRow } from "."

const LONG_LABEL = "A very long column value that has to give way to its count"

visualCases("InfoRow", {
    caption: { render: () => <InfoRow label="min" value={12.5} /> },
    data: { render: () => <InfoRow label="Germany" value={4021} labelIsData /> },
    "long-data-label": { render: () => <InfoRow label={LONG_LABEL} value={4021} labelIsData /> },
    "long-value": { render: () => <InfoRow label="path" value={LONG_LABEL} /> },
})
