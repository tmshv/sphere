import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { SliderField } from "@sphere/ui"

type HeatmapControlsProps = {
    layerId: string
    heatmapRadius: number
    heatmapIntensity: number
}

export function HeatmapControls({ layerId, heatmapRadius, heatmapIntensity }: HeatmapControlsProps) {
    const dispatch = useAppDispatch()

    return (
        <>
            <SliderField
                label="Radius"
                min={2}
                max={30}
                value={heatmapRadius}
                onChange={value => dispatch(actions.layer.setHeatmapParameters({ id: layerId, radius: value }))}
            />
            <SliderField
                label="Intensity"
                min={1}
                max={5}
                value={heatmapIntensity}
                onChange={value => dispatch(actions.layer.setHeatmapParameters({ id: layerId, intensity: value }))}
            />
        </>
    )
}
