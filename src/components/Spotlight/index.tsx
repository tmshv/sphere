import { SpotlightProvider } from "@mantine/spotlight"
import { IconClipboard, IconCopy, IconSearch, IconZoomReset } from "@tabler/icons"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { useMap } from "react-map-gl/maplibre"
import { copySelectionAsGeojson, copySelectionAsWkt } from "../../lib/copy-selection"
import { actions } from "../../store"
import { selectors } from "../../store/selectors"
import { useAppDispatch, useAppSelector } from "../../store/hooks"
import addFromClipboard from "../../store/source/addFromClipboard"

export type SpotlightProps = {
    mapId: string
    children: React.ReactNode
}

export const Spotlight: React.FC<SpotlightProps> = ({ children, mapId }) => {
    const { [mapId]: ref } = useMap()
    const dispatch = useAppDispatch()
    const selectionSourceId = useAppSelector(selectors.selection.sourceId)
    const selectionCount = useAppSelector(selectors.selection.count)
    const copyWrapFc = useAppSelector(selectors.settings.selectCopyWrapAsFeatureCollection)
    const copyWktSeparator = useAppSelector(selectors.settings.selectCopyWktSeparator)

    return (
        <SpotlightProvider
            actions={[
                {
                    title: "OSM",
                    description: "Set OSM map style",
                    onTrigger: () => {
                        dispatch(actions.mapStyle.setOsm())
                    },
                },
                {
                    title: "Toggle Dark Theme",
                    description: "Set Dark or Light theme",
                    onTrigger: () => {
                        dispatch(actions.app.toggleDarkTheme())
                    },
                },
                {
                    title: "Toggle Zen",
                    description: "Set Zen mode nn or off",
                    onTrigger: () => {
                        dispatch(actions.app.toggleZenMode())
                    },
                },
                {
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
                    title: "Sky",
                    description: "Toggle sky",
                    onTrigger: () => {
                        dispatch(actions.sky.toggle())
                    },
                },
                {
                    title: "Terrain",
                    description: "Toggle terrain",
                    onTrigger: () => {
                        dispatch(actions.terrain.toggle())
                    },
                },
                {
                    title: "Vector",
                    description: "Set vector map style",
                    onTrigger: () => {
                        dispatch(actions.mapStyle.setVector())
                    },
                },
                {
                    title: "Satellite",
                    description: "Set satellite map style",
                    onTrigger: () => {
                        dispatch(actions.mapStyle.setSatellite())
                    },
                },
                {
                    title: "Globe",
                    description: "Set Globe projection",
                    onTrigger: () => {
                        dispatch(actions.projection.setGlobe())
                    },
                },
                {
                    title: "Flat",
                    description: "Set Mercator projection",
                    onTrigger: () => {
                        dispatch(actions.projection.setFlat())
                    },
                },
                {
                    title: "Copy viewport",
                    description: "Copy current viewport state as JSON",
                    onTrigger: async () => {
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
                    },
                    icon: <IconCopy size={18} />,
                },
                {
                    title: "Reset rotation",
                    description: "Set pitch and bearing to 0",
                    onTrigger: async () => {
                        const map = ref?.getMap()
                        if (!map) {
                            return
                        }

                        map.setBearing(0)
                        map.setPitch(0)
                    },
                    icon: <IconZoomReset size={18} />,
                },
                {
                    title: "Toggle Show Tile Boundaries",
                    description: "Toggle visibility of tile boundaries",
                    onTrigger: async () => {
                        dispatch(actions.tileBoundaries.toggle())
                    },
                },
                {
                    title: "Paste GeoJSON",
                    description: "Create source from GeoJSON in clipboard",
                    icon: <IconClipboard size={18} />,
                    onTrigger: () => {
                        dispatch(addFromClipboard())
                    },
                },
                {
                    title: "Copy selection as GeoJSON",
                    description: "Copy selected features as GeoJSON to clipboard",
                    icon: <IconCopy size={18} />,
                    onTrigger: async () => {
                        if (selectionCount === 0 || selectionSourceId === undefined) {
                            return
                        }
                        await copySelectionAsGeojson(selectionSourceId, copyWrapFc)
                    },
                },
                {
                    title: "Copy selection as WKT",
                    description: "Copy selected features as WKT to clipboard",
                    icon: <IconCopy size={18} />,
                    onTrigger: async () => {
                        if (selectionCount === 0 || selectionSourceId === undefined) {
                            return
                        }
                        await copySelectionAsWkt(selectionSourceId, copyWktSeparator)
                    },
                },
            ]}
            searchIcon={<IconSearch size={18} />}
            searchPlaceholder="Search..."
            shortcut="mod + p"
            nothingFoundMessage="Nothing found..."
        >
            {children}
        </SpotlightProvider>
    )
}
