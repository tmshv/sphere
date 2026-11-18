import { Badge } from "./Badge"
import { visualCases } from "../visual/visualCases"

// A column narrower than the long value, so the badge shrinks and its text ends in an ellipsis.
const NARROW_WIDTH_PX = 96
const NARROW_STYLE = { display: "flex", width: NARROW_WIDTH_PX }
const LONG_VALUE = "https://tiles.example.com/cadastre/parcels/preview.png"

visualCases("InternalBadge", {
    "xs-light": {
        render: () => (
            <Badge size="xs" variant="light">
                string
            </Badge>
        ),
    },
    "sm-light": {
        render: () => (
            <Badge size="sm" variant="light">
                string
            </Badge>
        ),
    },
    "xs-filled": {
        render: () => (
            <Badge size="xs" variant="filled">
                string
            </Badge>
        ),
    },
    "sm-filled": {
        render: () => (
            <Badge size="sm" variant="filled">
                string
            </Badge>
        ),
    },
    "sm-outline": {
        render: () => (
            <Badge size="sm" variant="outline">
                example.com/a.png
            </Badge>
        ),
    },
    "long-text-truncated": {
        render: () => (
            <div style={NARROW_STYLE}>
                <Badge size="sm" variant="outline">
                    {LONG_VALUE}
                </Badge>
            </div>
        ),
    },
})
