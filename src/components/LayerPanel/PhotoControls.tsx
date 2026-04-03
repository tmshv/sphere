import { actions } from "@/store"
import type { PhotoIconLayout } from "@/store/layer"
import { useAppDispatch } from "@/store/hooks"
import { Input, Select, Slider } from "@mantine/core"
import type { FC } from "react"

type PhotoControlsProps = {
    layerId: string
    clusterRadius: number
    srcField: string | undefined
    valueField: string | undefined
    icon: PhotoIconLayout | undefined
    fields: string[]
}

export const PhotoControls: FC<PhotoControlsProps> = ({
    layerId,
    clusterRadius,
    srcField,
    valueField,
    icon,
    fields,
}) => {
    const dispatch = useAppDispatch()

    return (
        <>
            <Input.Wrapper label="Radius" size="xs">
                <Slider
                    label={"Radius"}
                    size={"xs"}
                    min={50}
                    max={200}
                    value={clusterRadius}
                    onChange={value => {
                        dispatch(
                            actions.layer.setPhotoClusterRadius({
                                id: layerId,
                                value,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
            <Select
                size="xs"
                label="Image field"
                placeholder="Pick one"
                value={srcField}
                data={fields}
                onChange={src => {
                    if (src) {
                        dispatch(
                            actions.layer.setPhotoField({
                                id: layerId,
                                src,
                            }),
                        )
                    }
                }}
            />
            <Select
                size="xs"
                label="Value field"
                placeholder="Pick one"
                value={valueField}
                data={fields}
                onChange={value => {
                    if (value) {
                        dispatch(
                            actions.layer.setPhotoField({
                                id: layerId,
                                value,
                            }),
                        )
                    }
                }}
            />
            <Select
                size="xs"
                label="Layout"
                placeholder="Pick one"
                value={icon}
                data={[
                    { value: "square", label: "Square" },
                    { value: "circle", label: "Circle" },
                ]}
                onChange={(value: PhotoIconLayout) => {
                    if (value) {
                        dispatch(
                            actions.layer.setPhotoIconLayout({
                                id: layerId,
                                value,
                            }),
                        )
                    }
                }}
            />
        </>
    )
}
