import { MapRef, ViewStateChangeEvent } from "react-map-gl";
import { useEffect, useState } from "react";

export function usePitch(ref?: MapRef): number {
    const [value, setValue] = useState<number>(0)
    useEffect(() => {
        if (!ref) {
            return
        }

        const map = ref.getMap()

        const callback = (event: ViewStateChangeEvent) => {
            setValue(event.viewState.pitch)
        }

        map.on("pitch", callback)
        setValue(map.getPitch())

        return () => {
            map.off("pitch", callback)
        }
    }, [ref])

    return value
}
