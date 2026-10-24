import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { ColorField, SliderField } from "@sphere/ui"

type PointControlsProps = {
    layerId: string
    color: string
    circleRange: [number, number]
}

export function PointControls({ layerId, color, circleRange }: PointControlsProps) {
    const dispatch = useAppDispatch()

    return (
        <>
            <ColorField
                label="Color"
                value={color}
                onChange={color => dispatch(actions.layer.setColor({ id: layerId, color }))}
            />
            <SliderField
                label="Radius"
                min={1}
                max={10}
                value={circleRange[1]}
                onChange={max => dispatch(actions.layer.setCircleRadius({ id: layerId, min: 0, max }))}
            />
        </>
    )
}
