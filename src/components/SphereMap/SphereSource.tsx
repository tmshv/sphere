import { ReactNode } from "react";
import { Source } from "react-map-gl";
import { useAppSelector } from "../../store/hooks";

const pointType = new Set(["Point", "MultiPoint"])
const lineType = new Set(["LineString", "MultiLineStreing"])
const polygonType = new Set(["Polygon", "MultiPolygon"])

// function useData(id: string) {

// }

export type SphereSourceProps = {
    mapId: string
    id: string
    children?: ReactNode
}

export const SphereSource: React.FC<SphereSourceProps> = ({ id, mapId, children }) => {
    // const { [mapId]: ref } = useMap()

    const data = useAppSelector(state => state.source.items[id].data)

    return (
        <>
            <Source
                id={id}
                type={"geojson"}
                data={data}
            >
                {children}
            </Source>
        </>
    );
}
