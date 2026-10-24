import { isPhotoIconLayout } from "@/lib/photo-icon-layout"
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import type { PhotoIconLayout } from "@/store/layer"
import { Select, SliderField } from "@sphere/ui"

const LAYOUT_OPTIONS = [
    { value: "square", label: "Square" },
    { value: "circle", label: "Circle" },
]

type PhotoControlsProps = {
    layerId: string
    clusterRadius: number
    srcField: string | undefined
    valueField: string | undefined
    icon: PhotoIconLayout | undefined
    fields: string[]
}

export function PhotoControls({ layerId, clusterRadius, srcField, valueField, icon, fields }: PhotoControlsProps) {
    const dispatch = useAppDispatch()

    return (
        <>
            <SliderField
                label="Radius"
                min={50}
                max={200}
                value={clusterRadius}
                onChange={value => dispatch(actions.layer.setPhotoClusterRadius({ id: layerId, value }))}
            />
            <Select
                label="Image field"
                placeholder="Pick one"
                value={srcField ?? null}
                options={fields}
                onChange={src => {
                    if (src) {
                        dispatch(actions.layer.setPhotoField({ id: layerId, src }))
                    }
                }}
            />
            <Select
                label="Value field"
                placeholder="Pick one"
                value={valueField ?? null}
                options={fields}
                onChange={value => {
                    if (value) {
                        dispatch(actions.layer.setPhotoField({ id: layerId, value }))
                    }
                }}
            />
            <Select
                label="Layout"
                placeholder="Pick one"
                value={icon ?? null}
                options={LAYOUT_OPTIONS}
                onChange={value => {
                    if (isPhotoIconLayout(value)) {
                        dispatch(actions.layer.setPhotoIconLayout({ id: layerId, value }))
                    }
                }}
            />
        </>
    )
}
