import { visualCases } from "../visual/visualCases"
import { SectionStack, type SectionLayout } from "."

const noop = () => {}
const BODY_STYLE = { fontSize: 12, padding: "0 12px" }
// Rows filled edge to edge, so the screenshot shows the flush body has no gap above the first one.
const ROW_STYLE = { ...BODY_STYLE, lineHeight: "24px", backgroundColor: "var(--sphere-color-tree-row-selected-bg)" }
const FLUSH_ROWS = ["first row", "second row"]

function Stack({ sections }: { sections: SectionLayout[] }) {
    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <SectionStack sections={sections} onSectionsChange={noop}>
                <SectionStack.Section name="outline" title="Outline" minContentSize={40}>
                    <div style={BODY_STYLE}>outline body</div>
                </SectionStack.Section>
                <SectionStack.Section name="details" title="Details" minContentSize={40}>
                    <div style={BODY_STYLE}>details body</div>
                </SectionStack.Section>
            </SectionStack>
        </div>
    )
}

function FlushStack() {
    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <SectionStack
                sections={[
                    { name: "outline", open: true, size: null },
                    { name: "details", open: true, size: null },
                ]}
                onSectionsChange={noop}
            >
                <SectionStack.Section name="outline" title="Outline" minContentSize={40} flush>
                    {FLUSH_ROWS.map(row => (
                        <div key={row} style={ROW_STYLE}>
                            {row}
                        </div>
                    ))}
                </SectionStack.Section>
                <SectionStack.Section name="details" title="Details" minContentSize={40}>
                    <div style={BODY_STYLE}>details body</div>
                </SectionStack.Section>
            </SectionStack>
        </div>
    )
}

visualCases("SectionStack", {
    "all-open": {
        render: () => (
            <Stack
                sections={[
                    { name: "outline", open: true, size: null },
                    { name: "details", open: true, size: null },
                ]}
            />
        ),
    },
    "one-closed": {
        render: () => (
            <Stack
                sections={[
                    { name: "outline", open: true, size: null },
                    { name: "details", open: false, size: null },
                ]}
            />
        ),
    },
    "all-closed": {
        render: () => (
            <Stack
                sections={[
                    { name: "outline", open: false, size: null },
                    { name: "details", open: false, size: null },
                ]}
            />
        ),
    },
    flush: {
        render: () => <FlushStack />,
    },
})
