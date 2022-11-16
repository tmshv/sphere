import { useMap } from "react-map-gl";
import { Badge } from '@mantine/core';
import { Statusbar } from '../../ui/Statusbar';
import { useCursor } from "../../hooks/useCursor";
import { useZoom } from "../../hooks/useZoom";
import { usePitch } from "../../hooks/usePitch";

function round(value: number, n: number): number {
    return Math.round(value * n) / n
}

export type MapStatusbarProps = {
    id: string
}

export const MapStatusbar: React.FC<MapStatusbarProps> = ({ id }) => {
    const { [id]: ref } = useMap()
    const [lng, lat] = useCursor(ref)
    const zoom = useZoom(ref)
    const pitch = usePitch(ref)

    return (
        <Statusbar>
            <Badge variant={"outline"} style={{ height: 20, width: 130, textAlign: "left" }}>lng={round(lng, 1000000)}</Badge>
            <Badge variant={"outline"} style={{ height: 20, width: 130, textAlign: "left" }}>lat={round(lat, 1000000)}</Badge>
            <Badge variant={"outline"} style={{ height: 20 }}>zoom={round(zoom, 1000)}</Badge>
            <Badge variant={"outline"} style={{ height: 20 }}>pitch={round(pitch, 1000)}</Badge>
        </Statusbar>
    );
}
