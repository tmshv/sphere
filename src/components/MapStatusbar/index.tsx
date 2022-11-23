import { useMap } from "react-map-gl";
import { ActionIcon, Badge, createStyles } from '@mantine/core';
import { Statusbar } from '@/ui/Statusbar';
import { useCursor } from "@/hooks/useCursor";
import { useZoom } from "@/hooks/useZoom";
import { usePitch } from "@/hooks/usePitch";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSourcesAmount } from "@/store/source";
import { IconLayoutSidebar, IconLiveView, IconMountain, IconNorthStar, IconSatellite, IconWorld, IconWorldOff } from "@tabler/icons";
import { actions } from "@/store";
import { selectChangeProjectionAvailable, selectProjection } from "@/store/projection";
import { selectShowLeftSidebar, selectVersion } from "@/store/app";
import { selectIsShowTerrain } from "@/store/terrain";
import { selectErrorMessage } from "@/store/error";

const useStyle = createStyles(theme => ({
    s: {
        flex: 1,
    },
    icon: {
        "&:hover": {
            backgroundColor: theme.colors.gray[8],
        }
    },
    active: {
        backgroundColor: theme.colors.gray[8],
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

    error: {
        backgroundColor: theme.colors.red[8],
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

    const sidebar = useAppSelector(selectShowLeftSidebar)
    const version = useAppSelector(selectVersion)
    const sources = useAppSelector(selectSourcesAmount)
    const projection = useAppSelector(selectProjection)
    const changeProjection = useAppSelector(selectChangeProjectionAvailable)
    const terrain = useAppSelector(selectIsShowTerrain)
    const errorMessage = useAppSelector(selectErrorMessage)
    const isGlobe = projection === "globe"

    return (
        <Statusbar>
            <ActionIcon size={'xs'} className={cx(s.icon, { [s.active]: sidebar })} onClick={() => {
                if (sidebar) {
                    dispatch(actions.app.hideLeftSidebar())
                } else {
                    dispatch(actions.app.showLeftSidebar())
                }
            }}>
                <IconLayoutSidebar size={16} />
            </ActionIcon>

            <Badge className={s.widget} radius={"sm"} size="sm" variant="light">sources={sources}</Badge>

            <Badge className={cx(s.widget, s.fix0)} radius={"sm"} size="sm" variant="light">pitch={format(round(pitch, 1000), 3)}</Badge>
            <Badge className={cx(s.widget, s.fix0)} radius={"sm"} size="sm" variant="light">zoom={format(round(zoom, 1000), 3)}</Badge>

            <Badge className={cx(s.widget, s.fix)} title={"Longitude"} radius={"sm"} size="sm" variant="light">lng={format(round(lng, 1000000), 5)}</Badge>
            <Badge className={cx(s.widget, s.fix)} title={"Latitude"} radius={"sm"} size="sm" variant="light">lat={format(round(lat, 1000000), 5)}</Badge>

            {!errorMessage ? null : (
                <Badge className={cx(s.widget, s.error)} title={"Error"} radius={"sm"} size="sm" variant="filled">
                    {errorMessage}
                </Badge>
            )}

            <div className={s.s}></div>

            <ActionIcon size={'xs'} className={cx(s.icon, { [s.active]: terrain })} onClick={() => {
                dispatch(actions.map.resetNorth({mapId: "spheremap"}))
            }}>
                <IconNorthStar size={16} />
            </ActionIcon>
            <ActionIcon size={'xs'} className={cx(s.icon, { [s.active]: terrain })} onClick={() => {
                dispatch(actions.terrain.toggle())
            }}>
                <IconMountain size={16} />
            </ActionIcon>
            <ActionIcon size={'xs'} className={cx(s.icon, { [s.active]: terrain })} onClick={() => {
                dispatch(actions.mapStyle.setSatellite())
            }}>
                <IconSatellite size={16} />
            </ActionIcon>
            <ActionIcon
                size={'xs'}
                className={s.icon}
                color={isGlobe ? "yellow" : undefined}
                disabled={!changeProjection}
                sx={{
                    "&[data-disabled]": {
                        backgroundColor: '#00000000',
                        border: 'none',
                    }
                }}
                onClick={() => {
                    if (isGlobe) {
                        dispatch(actions.projection.setFlat())
                    } else {
                        dispatch(actions.projection.setGlobe())
                    }
                }}
            >
                {isGlobe ? (
                    <IconWorld size={16} />
                ) : (
                    <IconWorldOff size={16} />
                )}
            </ActionIcon>

            <Badge className={s.widget} radius={"sm"} size={"sm"} variant="light">Sphere {version}</Badge>
        </Statusbar>
    );
}
