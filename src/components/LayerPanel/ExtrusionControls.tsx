import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { Badge, ColorPicker, Input, Select, Slider } from "@mantine/core"
import type { FC } from "react"

type ExtrusionControlsProps = {
    layerId: string
    color: string
    extrusionHeight: number
    extrusionHeightField: string | undefined
    extrusionBase: number
    extrusionBaseField: string | undefined
    fields: string[]
}

export const ExtrusionControls: FC<ExtrusionControlsProps> = ({
    layerId,
    color,
    extrusionHeight,
    extrusionHeightField,
    extrusionBase,
    extrusionBaseField,
    fields,
}) => {
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
            <Input.Wrapper label="Height" size="xs">
                <Slider
                    label={"Height"}
                    size={"xs"}
                    min={0}
                    max={10}
                    value={extrusionHeight}
                    onChange={value => {
                        dispatch(
                            actions.layer.setExtrusionOptions({
                                id: layerId,
                                height: value,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
            <Select
                searchable
                size="xs"
                label="Height field"
                placeholder="Pick one"
                value={extrusionHeightField}
                data={fields}
                onChange={value => {
                    if (value) {
                        dispatch(
                            actions.layer.setExtrusionOptions({
                                id: layerId,
                                heightField: value,
                            }),
                        )
                    }
                }}
            />
            <Input.Wrapper label="Base" size="xs">
                <Slider
                    label={"Base"}
                    size={"xs"}
                    min={0}
                    max={10}
                    value={extrusionBase}
                    onChange={value => {
                        dispatch(
                            actions.layer.setExtrusionOptions({
                                id: layerId,
                                base: value,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
            <Select
                searchable
                size="xs"
                label="Base field"
                placeholder="Pick one"
                value={extrusionBaseField}
                data={fields}
                onChange={value => {
                    if (value) {
                        dispatch(
                            actions.layer.setExtrusionOptions({
                                id: layerId,
                                baseField: value,
                            }),
                        )
                    }
                }}
            />
        </>
    )
}
