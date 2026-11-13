import type { Basemap } from "./basemap"
import type { Id } from "@/types"

export type DemEncoding = "terrarium" | "mapbox"

export type TerrainCandidate = {
    id: Id
    name: string
    encoding: DemEncoding
}

export type TerrainProviderId = "mapterhorn"

export type TerrainProvider = Basemap & { dem: DemEncoding }

// The hillshade algorithms MapLibre offers (`hillshade-method`)
export type HillshadeMethod = "standard" | "basic" | "combined" | "igor" | "multidirectional"

// Whether the light turns with the map or stays fixed on screen (`hillshade-illumination-anchor`)
export type HillshadeAnchor = "map" | "viewport"

// The user's hillshade look. One light source: `multidirectional` takes several, but only one is exposed.
export type HillshadeSettings = {
    intensity: number
    method: HillshadeMethod
    direction: number
    altitude: number
    anchor: HillshadeAnchor
    shadowColor: string
    highlightColor: string
    accentColor: string
}
