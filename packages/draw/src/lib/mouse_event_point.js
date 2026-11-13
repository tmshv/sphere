/**
 * Returns a mouse event's `{ x, y }` position relative to a containing element.
 */
function mouseEventPoint(mouseEvent, container) {
    const rect = container.getBoundingClientRect()
    return {
        x: mouseEvent.clientX - rect.left - (container.clientLeft || 0),
        y: mouseEvent.clientY - rect.top - (container.clientTop || 0),
    }
}

export default mouseEventPoint
