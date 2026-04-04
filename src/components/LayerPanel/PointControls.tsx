import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { Badge, ColorPicker, Input, Slider } from "@mantine/core"
import type { FC } from "react"

type PointControlsProps = {
    layerId: string
    color: string
    circleRange: [number, number]
}

export const PointControls: FC<PointControlsProps> = ({ layerId, color, circleRange }) => {
    const dispatch = useAppDispatch()

    return (
        <>
            <Input.Wrapper
                label={
                    <>
                        Color
                        <Badge ml={"xs"} size="xs" radius={"sm"}>
                            {color}
                        </Badge>
                    </>
                }
                size="xs"
            >
                <ColorPicker
                    format="hex"
                    size="xs"
                    value={color}
                    styles={theme => ({
                        wrapper: {
                            width: "100%",
                        },
                        saturation: {
                            height: 130,
                        },
                        slider: {
                            marginTop: theme.spacing.sm,
                        },
                    })}
                    onChange={color => {
                        dispatch(actions.layer.setColor({ id: layerId, color }))
                    }}
                />
            </Input.Wrapper>
            <Input.Wrapper label="Radius" size="xs">
                <Slider
                    size={"xs"}
                    min={1}
                    max={10}
                    value={circleRange[1]}
                    onChange={max => {
                        dispatch(
                            actions.layer.setCircleRadius({
                                id: layerId,
                                min: 0,
                                max,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
        </>
    )
}
