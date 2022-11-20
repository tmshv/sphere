import { ActionCreators } from 'redux-undo';

import { projectionSlice } from './projection'
import { mapStyleSlice } from './mapStyle'
import { fogSlice } from './fog'
import { terrainSlice } from './terrain'
import { actions as sourceActions } from './source'
import { actions as layerActions } from './layer'
import { selectionSlice } from './selection'
import { appSlice } from './app'
import { fitBounds, resize } from './map'

export const actions = {
    app: appSlice.actions,
    projection: projectionSlice.actions,
    mapStyle: mapStyleSlice.actions,
    fog: fogSlice.actions,
    terrain: terrainSlice.actions,
    source: sourceActions,
    layer: layerActions,
    map: {
        fitBounds,
        resize,
    },
    selection: selectionSlice.actions,
    undo: ActionCreators.undo,
    redo: ActionCreators.redo,
}
