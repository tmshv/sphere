export default function makeTouchEvent(lng = 0, lat = 0, eventProperties = {}) {
    return {
        originalEvent: {
            stopPropagation() {},
            preventDefault() {},
            button: 0,
            clientX: lng,
            clientY: lat,
            ...eventProperties,
        },
        point: { x: lng, y: lat },
        lngLat: { lng, lat },
    }
}
