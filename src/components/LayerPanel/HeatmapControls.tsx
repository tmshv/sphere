import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { Input, Slider } from "@mantine/core"
import type { FC } from "react"

type HeatmapControlsProps = {
    layerId: string
    heatmapRadius: number
    heatmapIntensity: number
}

export const HeatmapControls: FC<HeatmapControlsProps> = ({ layerId, heatmapRadius, heatmapIntensity }) => {
    const dispatch = useAppDispatch()

    return (
        <>
            <Input.Wrapper label="Radius" size="xs">
                <Slider
                    label={"Radius"}
                    size={"xs"}
                    min={2}
                    max={30}
                    value={heatmapRadius}
                    onChange={value => {
                        dispatch(
                            actions.layer.setHeatmapParameters({
                                id: layerId,
                                radius: value,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
            <Input.Wrapper label="Intensity" size="xs">
                <Slider
                    label={"Intensity"}
                    size={"xs"}
                    min={1}
                    max={5}
                    value={heatmapIntensity}
                    onChange={value => {
                        dispatch(
                            actions.layer.setHeatmapParameters({
                                id: layerId,
                                intensity: value,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
        </>
    )
}
