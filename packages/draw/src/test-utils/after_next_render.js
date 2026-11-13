/**
 * Returns `afterNextRender(cb?)`: a promise that resolves (and calls the
 * optional callback) once Draw has fired another `draw.render` event.
 */
export default function setupAfterNextRender(map) {
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
