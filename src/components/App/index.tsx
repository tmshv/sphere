import { StrictMode } from "react"
import { MapProvider } from "react-map-gl/maplibre"
import { Center } from "@mantine/core"
import { MapStatusbar } from "../MapStatusbar"
import { AppLayout } from "@/ui/AppLayout"
import { SphereMap } from "../SphereMap"
import { Spotlight } from "../Spotlight"
import { LeftSidebar } from "../LeftSidebar"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectIsZen, selectShowLeftSidebar } from "@/store/app"
import { Overlay } from "@/ui/Overlay"
import { Sidebar } from "@/ui/Sidebar"
import { actions } from "@/store"
import { WorkingIndicator } from "../WorkingIndicator"
import PropertiesPopup from "../PropertiesPopup"

export type AppProps = {

}

export const App: React.FC<AppProps> = () => {
    const dispatch = useAppDispatch()
    const id = "spheremap"
    const zen = useAppSelector(selectIsZen)
    const left = useAppSelector(selectShowLeftSidebar)

    const showLeft = left && !zen

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
                        leftSidebar={!showLeft ? null : (
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
