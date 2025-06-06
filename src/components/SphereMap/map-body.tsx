import { HandleHover } from "./HandleHover"

export type MapBodyProps = {
    mapId: string
}

export default function MapBody({ mapId }: MapBodyProps) {
    return (
        <>
            <HandleHover
                mapId={mapId}
            />
        </>
    )
}
