import type Evented from "./evented"

/**
 * Resolves on the mock map's `load` event, which `createMap` fires on the
 * next tick.
 */
export default function waitForLoad(map: Evented): Promise<void> {
    return new Promise(resolve => {
        map.on("load", () => resolve())
    })
}
