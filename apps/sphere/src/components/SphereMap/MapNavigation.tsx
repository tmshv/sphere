import useMapNavigation from "@/hooks/useMapNavigation"
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import type { MapRef } from "react-map-gl/maplibre"

// The key of the navigation while no draw session is open
const NO_SESSION = ""

export type MapNavigationProps = {
    mapRef: MapRef | undefined
}

function Navigation({ mapRef }: MapNavigationProps) {
    useMapNavigation(mapRef)
    return null
}

/**
 * Applies the map tool and the interaction settings to the map's handlers.
 *
 * The draw control saves the handlers when it is added and restores them when
 * it is removed, by which time the saved state can be stale (the map tool may
 * have changed in between). So the navigation remounts with every draw session
 * and applies the handlers again: its mount effect runs after the control's
 * removal cleanup.
 */
export default function MapNavigation({ mapRef }: MapNavigationProps) {
    const session = useAppSelector(selectors.draw.sourceId)
    return <Navigation key={session ?? NO_SESSION} mapRef={mapRef} />
}
