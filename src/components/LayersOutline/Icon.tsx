import { IconPolygon, IconPoint, IconLine, IconFlame, IconPhoto } from '@tabler/icons';
import { LayerType } from "@/types";

export type IconProps = {
    type?: LayerType
    color: string
}

export const Icon: React.FC<IconProps> = ({ type, color }) => {
    switch (type) {
        case LayerType.Point: {
            return (
                <IconPoint size={20} color={color} />
            )
        }
        case LayerType.Line: {
            return (
                <IconLine size={20} color={color} />
            )
        }
        case LayerType.Polygon: {
            return (
                <IconPolygon size={20} color={color} />
            )
        }
        case LayerType.Heatmap: {
            return (
                <IconFlame size={20} color={color} />
            )
        }
        case LayerType.Photo: {
            return (
                <IconPhoto size={20} color={color} />
            )
        }
        default: {
            return (
                <IconPoint size={20} color={undefined} />
            )
        }
    }
}
