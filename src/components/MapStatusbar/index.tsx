import { MAP_ID } from "@/const"
import { useCursor } from "@/hooks/useCursor"
import { usePitch } from "@/hooks/usePitch"
import { useZoom } from "@/hooks/useZoom"
import { actions } from "@/store"
import { selectors } from "@/store"
import {
    selectActiveSidebarTab,
    selectMapTool,
    selectShowFeatureProperties,
    selectShowLeftSidebar,
    selectVersion,
} from "@/store/app"
import { selectErrorMessage } from "@/store/error"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectSourcesAmount } from "@/store/source"
import { selectIsShowTerrain } from "@/store/terrain"
import { Statusbar } from "@/ui/Statusbar"
import { ActionIcon, Badge, MantineProvider, type MantineTheme, createStyles } from "@mantine/core"
import type { ActionIconProps } from "@mantine/core"
import {
    IconHandStop,
    IconInfoCircle,
    IconLayoutSidebar,
    IconLiveView,
    IconMountain,
    IconMountainOff,
    IconNorthStar,
    IconPointer,
    IconSatellite,
    IconWorld,
    IconWorldOff,
} from "@tabler/icons"
import { useCallback, useMemo } from "react"
import { useMap } from "react-map-gl/maplibre"

const useStyle = createStyles(theme => ({
    s: {
        flex: 1,
    },
    icon: {
        "&:hover": {
            backgroundColor: theme.colors.gray[8],
        },
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

const actionIconDefaultProps: Partial<ActionIconProps> = {
    size: "xs",
    radius: "sm",
    // className: s.icon,
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
    const projection = useAppSelector(selectors.projection.projection)
    const changeProjection = useAppSelector(selectors.projection.changeProjectionAvailable)
    const terrain = useAppSelector(selectIsShowTerrain)
    const errorMessage = useAppSelector(selectErrorMessage)
    const mapTool = useAppSelector(selectMapTool)
    const showFeatureProperties = useAppSelector(selectShowFeatureProperties)
    const activeTab = useAppSelector(selectActiveSidebarTab)
    const showTools = activeTab === "sources"
    const isGlobe = projection === "globe"

    const toggleSidebar = useCallback(() => {
        if (sidebar) {
            dispatch(actions.app.hideLeftSidebar())
        } else {
            dispatch(actions.app.showLeftSidebar())
        }
    }, [dispatch, sidebar])

    const toggleFeatureProperties = useCallback(() => {
        dispatch(actions.app.toggleFeatureProperties())
    }, [dispatch])

    const printViewport = useCallback(() => {
        dispatch(actions.map.printViewport({ mapId: MAP_ID }))
    }, [dispatch])

    const resetNorth = useCallback(() => {
        dispatch(actions.map.resetNorth({ mapId: MAP_ID }))
    }, [dispatch])

    const setSatellite = useCallback(() => {
        dispatch(actions.mapStyle.setSatellite())
    }, [dispatch])

    const toggleTerrain = useCallback(() => {
        dispatch(actions.terrain.toggle())
    }, [dispatch])

    const toggleProjection = useCallback(() => {
        if (isGlobe) {
            dispatch(actions.projection.setFlat())
        } else {
            dispatch(actions.projection.setGlobe())
        }
    }, [dispatch, isGlobe])

    const mantineTheme = useMemo(
        () => ({
            components: {
                ActionIcon: {
                    defaultProps: (theme: MantineTheme) => ({
                        ...actionIconDefaultProps,
                        className: s.icon,
                        sx: {
                            "&[data-disabled]": {
                                backgroundColor: "#00000000",
                                color: theme.colors.gray[8],
                                border: "none",
                            },
                        },
                    }),
                },
            },
        }),
        [s.icon],
    )

    return (
        <Statusbar>
            <MantineProvider theme={mantineTheme}>
                <ActionIcon className={cx(s.icon, { [s.active]: sidebar })} onClick={toggleSidebar}>
                    <IconLayoutSidebar size={16} />
                </ActionIcon>

                <Badge className={s.widget} radius={"sm"} size="sm" variant="light">
                    sources={sources}
                </Badge>

                <Badge className={cx(s.widget, s.fix0)} radius={"sm"} size="sm" variant="light">
                    pitch={format(round(pitch, 1000), 3)}
                </Badge>
                <Badge className={cx(s.widget, s.fix0)} radius={"sm"} size="sm" variant="light">
                    zoom={format(round(zoom, 1000), 3)}
                </Badge>

                <Badge className={cx(s.widget, s.fix)} title={"Longitude"} radius={"sm"} size="sm" variant="light">
                    lng={format(round(lng, 1000000), 5)}
                </Badge>
                <Badge className={cx(s.widget, s.fix)} title={"Latitude"} radius={"sm"} size="sm" variant="light">
                    lat={format(round(lat, 1000000), 5)}
                </Badge>

                {!errorMessage ? null : (
                    <Badge className={cx(s.widget, s.error)} title={"Error"} radius={"sm"} size="sm" variant="filled">
                        {errorMessage}
                    </Badge>
                )}

                <div className={s.s} />

                {showTools && (
                    <>
                        <ActionIcon
                            color={mapTool === "pan" ? "yellow" : undefined}
                            onClick={() => dispatch(actions.app.setMapTool("pan"))}
                            title="Pan"
                        >
                            <IconHandStop size={16} />
                        </ActionIcon>
                        <ActionIcon
                            color={mapTool === "select" ? "yellow" : undefined}
                            onClick={() => dispatch(actions.app.setMapTool("select"))}
                            title="Rect Select"
                        >
                            <IconPointer size={16} />
                        </ActionIcon>
                    </>
                )}

                <ActionIcon
                    color={showFeatureProperties ? "yellow" : undefined}
                    onClick={toggleFeatureProperties}
                    title="Feature properties popup"
                >
                    <IconInfoCircle size={16} />
                </ActionIcon>

                <ActionIcon onClick={printViewport}>
                    <IconLiveView size={16} />
                </ActionIcon>

                <ActionIcon onClick={resetNorth}>
                    <IconNorthStar size={16} />
                </ActionIcon>
                <ActionIcon disabled onClick={setSatellite}>
                    <IconSatellite size={16} />
                </ActionIcon>
                <ActionIcon disabled onClick={toggleTerrain}>
                    {terrain ? <IconMountain size={16} /> : <IconMountainOff size={16} />}
                </ActionIcon>
                <ActionIcon
                    color={isGlobe ? "yellow" : undefined}
                    disabled={!changeProjection}
                    onClick={toggleProjection}
                >
                    {isGlobe ? <IconWorld size={16} /> : <IconWorldOff size={16} />}
                </ActionIcon>

                <Badge className={s.widget} radius={"sm"} size={"sm"} variant="light">
                    Sphere {version}
                </Badge>
            </MantineProvider>
        </Statusbar>
    )
}
