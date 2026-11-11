import type { Id } from "@/types"

export type DemEncoding = "terrarium" | "mapbox"

export type TerrainCandidate = {
    id: Id
    name: string
    encoding: DemEncoding
}
