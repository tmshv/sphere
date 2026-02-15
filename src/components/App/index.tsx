import { StrictMode } from "react"
import { MapProvider } from "react-map-gl/maplibre"
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

export default function App() {
    const id = MAP_ID
    const dispatch = useAppDispatch()
    const zen = useAppSelector(selectors.app.isZen)
    const left = useAppSelector(selectShowLeftSidebar)

    return (
        <StrictMode>
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
                                onResize={() => {
                                    dispatch(actions.map.resize(id))
                                }}
                            >
                                <Center style={{
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    width: 28,
                                    height: 28,
                                }}>
                                    <WorkingIndicator />
                                </Center>
                                <LeftSidebar />
                            </Sidebar>
                        )}
                    >
                        <SphereMap
                            id={id}
                        />
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
        </StrictMode>
    )
}
