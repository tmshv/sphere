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
