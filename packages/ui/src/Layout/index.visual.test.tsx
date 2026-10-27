import { visualCases } from "../visual/visualCases"
import { Row, Stack } from "."

const BOX_STYLE = { background: "#4dabf7", color: "#000", padding: 4, fontSize: 12 }

function Box({ children }: { children: string }) {
    return <div style={BOX_STYLE}>{children}</div>
}

visualCases("Stack", {
    "gap-xs": {
        render: () => (
            <Stack gap="xs">
                <Box>One</Box>
                <Box>Two</Box>
            </Stack>
        ),
    },
    "gap-md-align-center": {
        render: () => (
            <Stack gap="md" align="center">
                <Box>One</Box>
                <Box>Longer two</Box>
            </Stack>
        ),
    },
    "gap-sm-align-end": {
        render: () => (
            <Stack gap="sm" align="end">
                <Box>One</Box>
                <Box>Longer two</Box>
            </Stack>
        ),
    },
})

visualCases("Row", {
    "gap-sm": {
        render: () => (
            <Row gap="sm">
                <Box>One</Box>
                <Box>Two</Box>
            </Row>
        ),
    },
    grow: {
        render: () => (
            <Row gap="xs" grow>
                <Box>One</Box>
                <Box>Two</Box>
                <Box>Three</Box>
            </Row>
        ),
    },
    "justify-between": {
        render: () => (
            <Row justify="between">
                <Box>One</Box>
                <Box>Two</Box>
            </Row>
        ),
    },
    "justify-end-align-center": {
        render: () => (
            <Row justify="end" align="center" gap="xxs" style={{ height: 80 }}>
                <Box>One</Box>
                <Box>Two</Box>
            </Row>
        ),
    },
})
