import { useMap } from "react-map-gl";
import { ActionIcon, createStyles, Text } from '@mantine/core';
import { Statusbar } from '../../ui/Statusbar';
import { useCursor } from "../../hooks/useCursor";
import { useZoom } from "../../hooks/useZoom";
import { usePitch } from "../../hooks/usePitch";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectSourcesAmount } from "../../store/source";
import { IconWorld } from "@tabler/icons";
import { actions } from "../../store";
import { selectProjection } from "../../store/projection";

const useStyle = createStyles(theme => ({
    s: {
        flex: 1,
    },
    icon: {
        "&:hover": {
            backgroundColor: theme.colors.gray[8],
        }
    },

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
    const dispatch = useAppDispatch()
    const { classes: s, cx } = useStyle()
    const { [id]: ref } = useMap()
    const [lng, lat] = useCursor(ref)
    const zoom = useZoom(ref)
    const pitch = usePitch(ref)

    const sources = useAppSelector(selectSourcesAmount)
    const projection = useAppSelector(selectProjection)
    const isGlobe = projection === "globe"

    return (
        <Statusbar>
            <Text className={s.widget} size={"xs"}>lng={round(lng, 1000000)}</Text>
            <Text className={s.widget} size={"xs"}>lat={round(lat, 1000000)}</Text>
            <Text className={s.widget} size={"xs"}>zoom={round(zoom, 1000)}</Text>
            <Text className={s.widget} size={"xs"}>pitch={round(pitch, 1000)}</Text>
            <Text className={s.widget} size={"xs"}>sources={sources}</Text>

            <div className={s.s}></div>

            <ActionIcon size={'xs'} className={s.icon} color={isGlobe ? "yellow" : undefined} onClick={() => {
                if (isGlobe) {
                    dispatch(actions.projection.setFlat())
                } else {
                    dispatch(actions.projection.setGlobe())
                }
            }}>
                <IconWorld size={16} />
            </ActionIcon>

            <Text className={s.widget} size={"xs"}>version={"0.0.0"}</Text>
        </Statusbar>
    );
}
