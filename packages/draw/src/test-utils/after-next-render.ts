import type Evented from "./evented"

/** Resolves once Draw has rendered again; calls the optional callback first. */
export type AfterNextRender = (cb?: () => void) => Promise<void>

/**
 * Returns `afterNextRender(cb?)`: a promise that resolves (and calls the
 * optional callback) once Draw has fired another `draw.render` event.
 */
export default function setupAfterNextRender(map: Evented): AfterNextRender {
    let render = 0
    map.on("draw.render", () => {
        render++
    })
    return function afterNextRender(cb) {
        const lastRender = render
        return new Promise(resolve => {
            const id = setInterval(() => {
                if (lastRender < render) {
                    clearInterval(id)
                    if (cb) cb()
                    resolve()
                }
            })
        })
    }
}
