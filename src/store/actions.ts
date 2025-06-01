import { projectionSlice } from "./projection"
import { mapStyleSlice } from "./mapStyle"
import { skySlice } from "./sky"
import { terrainSlice } from "./terrain"
import { actions as sourceActions } from "./source"
import { actions as layerActions } from "./layer"
import { actions as errorActions } from "./error"
import { selectionSlice } from "./selection"
import { propertiesSlice } from "./properties"
import { appSlice } from "./app"
import { actions as drawActions } from "./draw"
import { actions as mapActions } from "./map"
import addFile from "./effects/add-file"
import addMultipleFiles from "./effects/add-multiple-files"
import openFiles from "./effects/open-files"

export const actions = {
    app: appSlice.actions,
    draw: drawActions,
    error: errorActions,
    projection: projectionSlice.actions,
    mapStyle: mapStyleSlice.actions,
    sky: skySlice.actions,
    terrain: terrainSlice.actions,
    source: sourceActions,
    layer: layerActions,
    map: mapActions,
    selection: selectionSlice.actions,
    properties: propertiesSlice.actions,
    addFile,
    addMultipleFiles,
    openFiles,
}
