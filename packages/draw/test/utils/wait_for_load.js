/**
 * Resolves on the mock map's `load` event, which `createMap` fires on the
 * next tick.
 */
export default function waitForLoad(map) {
    return new Promise(resolve => {
        map.on("load", resolve)
    })
}
