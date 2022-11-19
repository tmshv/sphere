import { ReactNode } from "react";
import { Source } from "react-map-gl";
import { useAppSelector } from "../../store/hooks";

export type SphereSourceProps = {
    id: string
    children?: ReactNode
}

export const SphereSource: React.FC<SphereSourceProps> = ({ id, children }) => {
    const data = useAppSelector(state => state.source.items[id].data)
    if (!data) {
        return null
    }

    return (
        <Source
            id={id}
            type={"geojson"}
            data={data}
        >
            {children}
        </Source>
    );
}
