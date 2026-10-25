import { CommandPalette, type Command } from "@sphere/ui"
import { IconClipboard, IconCopy, IconZoomReset } from "@tabler/icons"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { useMap } from "react-map-gl/maplibre"
import { fireAndLog } from "../../lib/fire-and-log"
import { copySelectionAsGeojson, copySelectionAsWkt } from "../../lib/copy-selection"
import { actions } from "../../store"
import { selectors } from "../../store/selectors"
import { useAppDispatch, useAppSelector } from "../../store/hooks"
import addFromClipboard from "../../store/source/addFromClipboard"

export type SpotlightProps = {
    mapId: string
    children: React.ReactNode
}

const ICON_SIZE = 18
const SHORTCUT = "mod + p"
const PLACEHOLDER = "Search..."
const EMPTY_MESSAGE = "Nothing found..."

export function Spotlight({ children, mapId }: SpotlightProps) {
    const { [mapId]: ref } = useMap()
    const dispatch = useAppDispatch()
    const selectionSourceId = useAppSelector(selectors.selection.sourceId)
    const selectionCount = useAppSelector(selectors.selection.count)
    const copyWrapFc = useAppSelector(selectors.settings.selectCopyWrapAsFeatureCollection)
    const copyWktSeparator = useAppSelector(selectors.settings.selectCopyWktSeparator)

    const commands: Command[] = [
        {
            id: "osm",
            title: "OSM",
            description: "Set OSM map style",
            onTrigger: () => {
                dispatch(actions.mapStyle.setOsm())
            },
        },
        {
            id: "toggle-dark-theme",
            title: "Toggle Dark Theme",
            description: "Set Dark or Light theme",
            onTrigger: () => {
                dispatch(actions.app.toggleDarkTheme())
            },
        },
        {
            id: "toggle-zen",
            title: "Toggle Zen",
            description: "Set Zen mode nn or off",
            onTrigger: () => {
                dispatch(actions.app.toggleZenMode())
            },
        },
        {
            id: "earth",
            title: "Earth",
            description: "Set Earth map view",
            onTrigger: () => {
                dispatch(actions.terrain.show())
                dispatch(actions.sky.show())
                dispatch(actions.projection.setGlobe())
                dispatch(actions.mapStyle.setSatellite())
            },
        },
        {
            id: "simple",
            title: "Simple",
            description: "Set simple map view",
            onTrigger: () => {
                dispatch(actions.terrain.hide())
                dispatch(actions.sky.hide())
                dispatch(actions.projection.setFlat())
                dispatch(actions.mapStyle.setVector())
            },
        },
        {
            id: "sky",
            title: "Sky",
            description: "Toggle sky",
            onTrigger: () => {
                dispatch(actions.sky.toggle())
            },
        },
        {
            id: "terrain",
            title: "Terrain",
            description: "Toggle terrain",
            onTrigger: () => {
                dispatch(actions.terrain.toggle())
            },
        },
        {
            id: "vector",
            title: "Vector",
            description: "Set vector map style",
            onTrigger: () => {
                dispatch(actions.mapStyle.setVector())
            },
        },
        {
            id: "satellite",
            title: "Satellite",
            description: "Set satellite map style",
            onTrigger: () => {
                dispatch(actions.mapStyle.setSatellite())
            },
        },
        {
            id: "globe",
            title: "Globe",
            description: "Set Globe projection",
            onTrigger: () => {
                dispatch(actions.projection.setGlobe())
            },
        },
        {
            id: "flat",
            title: "Flat",
            description: "Set Mercator projection",
            onTrigger: () => {
                dispatch(actions.projection.setFlat())
            },
        },
        {
            id: "copy-viewport",
            title: "Copy viewport",
            description: "Copy current viewport state as JSON",
            onTrigger: fireAndLog(async () => {
                const map = ref?.getMap()
                if (!map) {
                    return
                }

                const center = map.getCenter()
                const zoom = map.getZoom()
                const pitch = map.getPitch()
                const bearing = map.getBearing()
                const maxPitch = map.getMaxPitch()
                const payload = {
                    center,
                    zoom,
                    pitch,
                    bearing,
                    maxPitch,
                }
                const data = JSON.stringify(payload, null, 4)

                await writeText(data)
            }, "Failed to copy viewport"),
            icon: <IconCopy size={ICON_SIZE} />,
        },
        {
            id: "reset-rotation",
            title: "Reset rotation",
            description: "Set pitch and bearing to 0",
            onTrigger: fireAndLog(async () => {
                const map = ref?.getMap()
                if (!map) {
                    return
                }

                map.setBearing(0)
                map.setPitch(0)
            }, "Failed to reset rotation"),
            icon: <IconZoomReset size={ICON_SIZE} />,
        },
        {
            id: "toggle-tile-boundaries",
            title: "Toggle Show Tile Boundaries",
            description: "Toggle visibility of tile boundaries",
            onTrigger: fireAndLog(async () => {
                dispatch(actions.tileBoundaries.toggle())
            }, "Failed to toggle tile boundaries"),
        },
        {
            id: "paste-geojson",
            title: "Paste GeoJSON",
            description: "Create source from GeoJSON in clipboard",
            icon: <IconClipboard size={ICON_SIZE} />,
            onTrigger: () => {
                dispatch(addFromClipboard())
            },
        },
        {
            id: "copy-selection-geojson",
            title: "Copy selection as GeoJSON",
            description: "Copy selected features as GeoJSON to clipboard",
            icon: <IconCopy size={ICON_SIZE} />,
            onTrigger: fireAndLog(async () => {
                if (selectionCount === 0 || selectionSourceId === undefined) {
                    return
                }
                await copySelectionAsGeojson(selectionSourceId, copyWrapFc)
            }, "Failed to copy selection as GeoJSON"),
        },
        {
            id: "copy-selection-wkt",
            title: "Copy selection as WKT",
            description: "Copy selected features as WKT to clipboard",
            icon: <IconCopy size={ICON_SIZE} />,
            onTrigger: fireAndLog(async () => {
                if (selectionCount === 0 || selectionSourceId === undefined) {
                    return
                }
                await copySelectionAsWkt(selectionSourceId, copyWktSeparator)
            }, "Failed to copy selection as WKT"),
        },
    ]

    return (
        <CommandPalette commands={commands} shortcut={SHORTCUT} placeholder={PLACEHOLDER} emptyMessage={EMPTY_MESSAGE}>
            {children}
        </CommandPalette>
    )
}
