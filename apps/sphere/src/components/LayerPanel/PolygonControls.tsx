import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { ColorField } from "@sphere/ui"

type PolygonControlsProps = {
    layerId: string
    color: string
}

export function PolygonControls({ layerId, color }: PolygonControlsProps) {
    const dispatch = useAppDispatch()

    return (
        <ColorField
            label="Color"
            value={color}
            onChange={color => dispatch(actions.layer.setColor({ id: layerId, color }))}
        />
    )
}
