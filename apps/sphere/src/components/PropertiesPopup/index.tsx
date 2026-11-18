import { selectors } from "@/store/selectors"
import { useAppSelector } from "@/store/hooks"
import { Heading, Overlay, PanelBody, PropertyList, Surface } from "@sphere/ui"

// The panel is sized by its content and capped by the overlay region, so it
// never covers the map with an invisible full-height block. It has no side
// padding: PanelBody insets the heading and the list itself, so the list
// scrolls right up to the panel edge and the overlay scrollbar macOS draws
// there rides over that inset instead of over the copy glyphs.
const PAPER_STYLE: React.CSSProperties = {
    minWidth: 300,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    paddingLeft: 0,
    paddingRight: 0,
}

export default function PropertiesPopup() {
    const entries = useAppSelector(selectors.propertiesPopup.entries)
    if (!entries) {
        return null
    }

    return (
        <Overlay
            topRight={
                <Surface style={PAPER_STYLE}>
                    <PanelBody header={<Heading>Properties</Heading>}>
                        {entries.map(x => (
                            <PropertyList key={x.id} items={x.items} />
                        ))}
                    </PanelBody>
                </Surface>
            }
        />
    )
}
