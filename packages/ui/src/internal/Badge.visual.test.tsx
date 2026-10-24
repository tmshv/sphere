import { Badge } from "./Badge"
import { visualCases } from "../visual/visualCases"

visualCases("InternalBadge", {
    "xs-light-sm": {
        render: () => (
            <Badge size="xs" variant="light" radius="sm">
                string
            </Badge>
        ),
    },
    "sm-light-sm": {
        render: () => (
            <Badge size="sm" variant="light" radius="sm">
                string
            </Badge>
        ),
    },
    "sm-light-xl": {
        render: () => (
            <Badge size="sm" variant="light" radius="xl">
                string
            </Badge>
        ),
    },
    "xs-filled-sm": {
        render: () => (
            <Badge size="xs" variant="filled" radius="sm">
                string
            </Badge>
        ),
    },
    "sm-filled-xl": {
        render: () => (
            <Badge size="sm" variant="filled" radius="xl">
                string
            </Badge>
        ),
    },
})
