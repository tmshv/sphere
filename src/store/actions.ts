import { projectionSlice } from "./projection"
import { mapStyleSlice } from "./mapStyle"
import { fogSlice } from "./fog"
import { terrainSlice } from "./terrain"
import { actions as sourceActions } from "./source"
import { actions as layerActions } from "./layer"
import { actions as errorActions } from "./error"
import { selectionSlice } from "./selection"
import { appSlice } from "./app"
import { actions as drawActions } from "./draw"
import { actions as mapActions } from "./map"

export const actions = {
    app: appSlice.actions,
    draw: drawActions,
    error: errorActions,
    projection: projectionSlice.actions,
    mapStyle: mapStyleSlice.actions,
    fog: fogSlice.actions,
    terrain: terrainSlice.actions,
    source: sourceActions,
    layer: layerActions,
    map: mapActions,
    selection: selectionSlice.actions,
}
