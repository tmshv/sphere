import { useCallback } from "react"
import { MapProvider } from "react-map-gl/maplibre"
import { ErrorBoundary } from "react-error-boundary"
import { Center } from "@mantine/core"
import { MapStatusbar } from "../MapStatusbar"
import { AppLayout } from "@/ui/AppLayout"
import { SphereMap } from "../SphereMap"
import { Spotlight } from "../Spotlight"
import { LeftSidebar } from "../LeftSidebar"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectShowLeftSidebar } from "@/store/app"
import { MAP_ID } from "@/const"
import { Overlay } from "@/ui/Overlay"
import { Sidebar } from "@/ui/Sidebar"
import { actions, selectors } from "@/store"
import { WorkingIndicator } from "../WorkingIndicator"
import PropertiesPopup from "../PropertiesPopup"
import { ErrorFallback } from "@/ui/ErrorFallback"
import logger from "@/logger"

const WORKING_INDICATOR_STYLE: React.CSSProperties = {
    position: "absolute",
    top: 0,
    right: 0,
    width: 28,
    height: 28,
}

export default function App() {
    const id = MAP_ID
    const dispatch = useAppDispatch()

    const onResize = useCallback(() => {
        dispatch(actions.map.resize(id))
    }, [dispatch, id])
    const zen = useAppSelector(selectors.app.isZen)
    const left = useAppSelector(selectShowLeftSidebar)

    return (
        <MapProvider>
            <Spotlight
                mapId={id}
            >
                <AppLayout
                    footer={(
                        <MapStatusbar
                            id={id}
                        />
                    )}
                    leftSidebar={!left ? null : (
                        <Sidebar
                            startWidth={300}
                            minWidth={265}
                            maxWidth={500}
                            onResize={onResize}
                        >
                            <Center style={WORKING_INDICATOR_STYLE}>
                                <WorkingIndicator />
                            </Center>
                            <ErrorBoundary
                                fallbackRender={(props) => <ErrorFallback {...props} variant="sidebar" />}
                                onError={(error) => logger.error("LeftSidebar crashed: %s", error instanceof Error ? error.message : error)}
                            >
                                <LeftSidebar />
                            </ErrorBoundary>
                        </Sidebar>
                    )}
                >
                    <ErrorBoundary
                        fallbackRender={(props) => <ErrorFallback {...props} variant="fullscreen" />}
                        onError={(error) => logger.error("SphereMap crashed: %s", error instanceof Error ? error.message : error)}
                    >
                        <SphereMap
                            id={id}
                        />
                    </ErrorBoundary>
                    {/* <MapContextMenu
                        id={id}
                        copyLocationValue={copy}
                    /> */}
                    {zen ? null : (
                        <Overlay
                        // right={(
                        //     <Toolbar></Toolbar>
                        // )}
                        />
                    )}
                    <PropertiesPopup />
                </AppLayout>
            </Spotlight>
        </MapProvider>
    )
}
