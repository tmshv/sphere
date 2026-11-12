import { Badge } from "./Badge"
import { visualCases } from "../visual/visualCases"

visualCases("InternalBadge", {
    "xs-light-sm": {
        render: () => (
            <Badge size="xs" variant="light">
                string
            </Badge>
        ),
    },
    "sm-light-sm": {
        render: () => (
            <Badge size="sm" variant="light">
                string
            </Badge>
        ),
    },
    "sm-light-xl": {
        render: () => (
            <Badge size="sm" variant="light">
                string
            </Badge>
        ),
    },
    "xs-filled-sm": {
        render: () => (
            <Badge size="xs" variant="filled">
                string
            </Badge>
        ),
    },
    "sm-filled-xl": {
        render: () => (
            <Badge size="sm" variant="filled">
                string
            </Badge>
        ),
    },
    "xs-light-xs": {
        render: () => (
            <Badge size="xs" variant="light">
                int
            </Badge>
        ),
    },
    "sm-outline-sm": {
        render: () => (
            <Badge size="sm" variant="outline">
                example.com/a.png
            </Badge>
        ),
    },
})
