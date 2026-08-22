import { selectors } from "@/store/selectors"
import { useAppSelector } from "@/store/hooks"
import { Overlay, PropertiesViewer } from "@sphere/ui"
import { Paper, Title } from "@mantine/core"

// The panel is sized by its content and capped by the overlay region, so it
// never covers the map with an invisible full-height block.
const PAPER_STYLE: React.CSSProperties = {
    minWidth: 300,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
}

const BODY_STYLE: React.CSSProperties = {
    minHeight: 0,
    overflowY: "auto",
}

export default function PropertiesPopup() {
    const entries = useAppSelector(selectors.propertiesPopup.entries)
    if (!entries) {
        return null
    }

    return (
        <Overlay
            topRight={
                <Paper p={"sm"} style={PAPER_STYLE}>
                    <Title order={3}>Properties</Title>
                    <div style={BODY_STYLE}>
                        {entries.map(x => (
                            <PropertiesViewer key={x.id} properties={x.items} />
                        ))}
                    </div>
                </Paper>
            }
        />
    )
}
