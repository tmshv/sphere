import { Flex } from "@mantine/core"

// A panel body is split in two: a header that always stays put — controls
// belong there — and the body below it, which scrolls when the panel runs out
// of room. Both need the parent to give the panel a bounded height.
const CONTAINER_STYLE: React.CSSProperties = {
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
}

const HEADER_STYLE: React.CSSProperties = {
    flexShrink: 0,
}

const BODY_STYLE: React.CSSProperties = {
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
}

export type PanelBodyProps = {
    header?: React.ReactNode
    children: React.ReactNode
}

export const PanelBody: React.FC<PanelBodyProps> = ({ header, children }) => (
    <Flex direction={"column"} gap={"md"} style={CONTAINER_STYLE}>
        {!header ? null : <div style={HEADER_STYLE}>{header}</div>}
        <div style={BODY_STYLE}>{children}</div>
    </Flex>
)
