import type { FC } from "react"
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { TileJsonSection } from "./parts/TileJsonSection"

export const RasterTilesSourcePanel: FC = () => {
    const source = useAppSelector(selectors.source.selectCurrentSourceItem)

    if (!source || (source.type !== SourceType.MVT && source.type !== SourceType.Raster)) {
        return null
    }
    const tilejson = source.type === SourceType.MVT ? source.tilejson : null

    return <TileJsonSection tilejson={tilejson} />
}
