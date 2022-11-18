import { useMap } from "react-map-gl";
import { ActionIcon, Badge, createStyles } from '@mantine/core';
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

        justifyContent: "start",

        // For pixel perfect vertical alignment.
        // Works together with Statusbar height 27 px
        position: "relative",
        top: 1,

        backgroundColor: theme.colors.dark,
        color: theme.white,
    },

    fix0: {
        width: 90,
    },

    fix: {
        width: 101,
    },
}))

function round(value: number, n: number): number {
    return Math.round(value * n) / n
}

function format(value: number, floatingLength: number): string {
    const [a, b] = `${value}`.split(".")
    if (!b) {
        return a
    }

    const c = b.padEnd(floatingLength)
    return `${a}.${c}`
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

            <Badge className={s.widget} radius={"sm"} size="sm" variant="light">sources={sources}</Badge>

            <Badge className={cx(s.widget, s.fix0)} radius={"sm"} size="sm" variant="light">pitch={format(round(pitch, 1000), 3)}</Badge>
            <Badge className={cx(s.widget, s.fix0)} radius={"sm"} size="sm" variant="light">zoom={format(round(zoom, 1000), 3)}</Badge>

            <Badge className={cx(s.widget, s.fix)} title={"Longitude"} radius={"sm"} size="sm" variant="light">lng={format(round(lng, 1000000), 5)}</Badge>
            <Badge className={cx(s.widget, s.fix)} title={"Latitude"} radius={"sm"} size="sm" variant="light">lat={format(round(lat, 1000000), 5)}</Badge>

            <div className={s.s}></div>

            <Badge className={s.widget} radius={"sm"} size={"sm"} variant="light">Sphere {version}</Badge>
        </Statusbar>
    );
}
