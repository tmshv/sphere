import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { ColorField } from "@sphere/ui"

type LineControlsProps = {
    layerId: string
    color: string
}

export function LineControls({ layerId, color }: LineControlsProps) {
    const dispatch = useAppDispatch()

    return (
        <ColorField
            label="Color"
            value={color}
            onChange={color => dispatch(actions.layer.setColor({ id: layerId, color }))}
        />
    )
}
