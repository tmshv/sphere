import { appSlice } from "./app"
import { actions as drawActions } from "./draw"
import addFile from "./effects/add-file"
import addMultipleFiles from "./effects/add-multiple-files"
import openFiles from "./effects/open-files"
import { actions as errorActions } from "./error"
import { actions as layerActions } from "./layer"
import { actions as mapActions } from "./map"
import { mapStyleSlice } from "./mapStyle"
import { projectionSlice } from "./projection"
import { propertiesSlice } from "./properties"
import { selectionSlice } from "./selection"
import { skySlice } from "./sky"
import { actions as sourceActions } from "./source"
import { terrainSlice } from "./terrain"
import { mapInteractionSlice } from "./map-interaction"
import { tileBoundariesSlice } from "./tile-boundaries"
import { toolsSlice } from "./tools"

export const actions = {
    app: appSlice.actions,
    draw: drawActions,
    error: errorActions,
    projection: projectionSlice.actions,
    tileBoundaries: tileBoundariesSlice.actions,
    mapStyle: mapStyleSlice.actions,
    sky: skySlice.actions,
    terrain: terrainSlice.actions,
    source: sourceActions,
    layer: layerActions,
    map: mapActions,
    selection: selectionSlice.actions,
    properties: propertiesSlice.actions,
    mapInteraction: mapInteractionSlice.actions,
    tools: toolsSlice.actions,
    addFile,
    addMultipleFiles,
    openFiles,
}
