import { MAP_ID } from "@/const"
import logger from "@/logger"
import { actions, selectors } from "@/store"
import { selectShowLeftSidebar } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import addFromClipboard from "@/store/source/addFromClipboard"
import { AppLayout } from "@/ui/AppLayout"
import { ErrorFallback } from "@/ui/ErrorFallback"
import { Overlay } from "@/ui/Overlay"
import { Sidebar } from "@/ui/Sidebar"
import { Center } from "@mantine/core"
import { useHotkeys } from "@mantine/hooks"
import { useCallback } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { MapProvider } from "react-map-gl/maplibre"
import { LeftSidebar } from "../LeftSidebar"
import { MapStatusbar } from "../MapStatusbar"
import PropertiesPopup from "../PropertiesPopup"
import { SphereMap } from "../SphereMap"
import { Spotlight } from "../Spotlight"
import { WorkingIndicator } from "../WorkingIndicator"

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

    useHotkeys([["mod+V", () => dispatch(addFromClipboard())]])
    const zen = useAppSelector(selectors.app.isZen)
    const left = useAppSelector(selectShowLeftSidebar)

    return (
        <MapProvider>
            <Spotlight mapId={id}>
                <AppLayout
                    footer={<MapStatusbar id={id} />}
                    leftSidebar={
                        !left ? null : (
                            <Sidebar startWidth={300} minWidth={265} maxWidth={500} onResize={onResize}>
                                <Center style={WORKING_INDICATOR_STYLE}>
                                    <WorkingIndicator />
                                </Center>
                                <ErrorBoundary
                                    fallbackRender={props => <ErrorFallback {...props} variant="sidebar" />}
                                    onError={error =>
                                        logger.error(
                                            "LeftSidebar crashed: %s",
                                            error instanceof Error ? error.message : error,
                                        )
                                    }
                                >
                                    <LeftSidebar />
                                </ErrorBoundary>
                            </Sidebar>
                        )
                    }
                >
                    <ErrorBoundary
                        fallbackRender={props => <ErrorFallback {...props} variant="fullscreen" />}
                        onError={error =>
                            logger.error("SphereMap crashed: %s", error instanceof Error ? error.message : error)
                        }
                    >
                        <SphereMap id={id} />
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
