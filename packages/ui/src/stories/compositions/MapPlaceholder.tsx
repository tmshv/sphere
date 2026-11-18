import { MAP_CAPTION } from "../fixtures"
import { mapCaptionStyle, mapPlaceholderStyle } from "../layout"

/** A neutral hatched area standing in for the map. It is not a map and draws nothing. */
export function MapPlaceholder() {
    return (
        <div style={mapPlaceholderStyle}>
            <span style={mapCaptionStyle}>{MAP_CAPTION}</span>
        </div>
    )
}
