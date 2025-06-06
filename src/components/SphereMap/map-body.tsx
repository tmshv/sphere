import usePointerHover from "@/sphere-hooks/usePointerHover"

export type MapBodyProps = {
    mapId: string
}

export default function MapBody({ mapId }: MapBodyProps) {
    usePointerHover(mapId)
    return null
}
