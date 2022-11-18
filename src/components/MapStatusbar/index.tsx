import { useMap } from "react-map-gl";
import { ActionIcon, Badge, createStyles, Text } from '@mantine/core';
import { Statusbar } from '../../ui/Statusbar';
import { useCursor } from "../../hooks/useCursor";
import { useZoom } from "../../hooks/useZoom";
import { usePitch } from "../../hooks/usePitch";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectSourcesAmount } from "../../store/source";
import { IconWorld } from "@tabler/icons";
import { actions } from "../../store";
import { selectProjection } from "../../store/projection";
import { selectVersion } from "../../store/app";

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
        userSelect: "none",
        cursor: "default",

        // For pixel perfect vertical alignment.
        // Works together with Statusbar height 27 px
        position: "relative",
        top: 1,
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
    const { classes: s } = useStyle()
    const { [id]: ref } = useMap()
    const [lng, lat] = useCursor(ref)
    const zoom = useZoom(ref)
    const pitch = usePitch(ref)

    const version = useAppSelector(selectVersion)
    const sources = useAppSelector(selectSourcesAmount)
    const projection = useAppSelector(selectProjection)
    const isGlobe = projection === "globe"

    return (
        <Statusbar>
            <ActionIcon size={'xs'} className={s.icon} color={isGlobe ? "yellow" : undefined} onClick={() => {
                if (isGlobe) {
                    dispatch(actions.projection.setFlat())
                } else {
                    dispatch(actions.projection.setGlobe())
                }
            }}>
                <IconWorld size={16} />
            </ActionIcon>

            <Badge className={s.widget} radius={"sm"} size="sm" variant="light" color={"dark"}>sources={sources}</Badge>

            <Badge className={s.widget} radius={"sm"} size="sm" variant="light" color={"dark"}>zoom={round(zoom, 1000)}</Badge>
            <Badge className={s.widget} radius={"sm"} size="sm" variant="light" color={"dark"}>pitch={round(pitch, 1000)}</Badge>

            <Badge className={s.widget} radius={"sm"} size="sm" variant="light" color={"dark"}>lng={round(lng, 1000000)}</Badge>
            <Badge className={s.widget} radius={"sm"} size="sm" variant="light" color={"dark"}>lat={round(lat, 1000000)}</Badge>

            <div className={s.s}></div>

            <Badge className={s.widget} radius={"sm"} size={"sm"} variant="light" color={"dark"}>Sphere {version}</Badge>
        </Statusbar>
    );
}
