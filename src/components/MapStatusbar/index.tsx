import { useMap } from "react-map-gl";
import { createStyles, Text } from '@mantine/core';
import { Statusbar } from '../../ui/Statusbar';
import { useCursor } from "../../hooks/useCursor";
import { useZoom } from "../../hooks/useZoom";
import { usePitch } from "../../hooks/usePitch";

const useStyle = createStyles(theme => ({
    widget: {
        fontFamily: "monospace",
    }
}))

function round(value: number, n: number): number {
    return Math.round(value * n) / n
}

export type MapStatusbarProps = {
    id: string
}

export const MapStatusbar: React.FC<MapStatusbarProps> = ({ id }) => {
    const { classes: s } = useStyle()
    const { [id]: ref } = useMap()
    const [lng, lat] = useCursor(ref)
    const zoom = useZoom(ref)
    const pitch = usePitch(ref)

    return (
        <Statusbar>
            <Text className={s.widget} size={"xs"}>lng={round(lng, 1000000)}</Text>
            <Text className={s.widget} size={"xs"}>lat={round(lat, 1000000)}</Text>
            <Text className={s.widget} size={"xs"}>zoom={round(zoom, 1000)}</Text>
            <Text className={s.widget} size={"xs"}>pitch={round(pitch, 1000)}</Text>
        </Statusbar>
    );
}
