import runSetup from "./setup"
import setupOptions from "./options"
import setupAPI from "./api"
import * as Constants from "./constants"
import * as lib from "./lib"

const setupDraw = (options, api) => {
    options = setupOptions(options)

    const ctx = {
        options,
    }

    api = setupAPI(ctx, api)
    ctx.api = api

    const setup = runSetup(ctx)

    api.onAdd = setup.onAdd
    api.onRemove = setup.onRemove
    api.types = Constants.types
    api.options = options

    return api
}

function MapLibreDraw(options) {
    setupDraw(options, this)
}

import modes from "./modes"
MapLibreDraw.modes = modes
MapLibreDraw.constants = Constants
MapLibreDraw.lib = lib

export default MapLibreDraw
