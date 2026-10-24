import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { ColorField, Select, SliderField } from "@sphere/ui"

type ExtrusionControlsProps = {
    layerId: string
    color: string
    extrusionHeight: number
    extrusionHeightField: string | undefined
    extrusionBase: number
    extrusionBaseField: string | undefined
    fields: string[]
}

export function ExtrusionControls({
    layerId,
    color,
    extrusionHeight,
    extrusionHeightField,
    extrusionBase,
    extrusionBaseField,
    fields,
}: ExtrusionControlsProps) {
    const dispatch = useAppDispatch()

    return (
        <>
            <ColorField
                label="Color"
                value={color}
                onChange={color => dispatch(actions.layer.setColor({ id: layerId, color }))}
            />
            <SliderField
                label="Height"
                min={0}
                max={10}
                value={extrusionHeight}
                onChange={value => dispatch(actions.layer.setExtrusionOptions({ id: layerId, height: value }))}
            />
            <Select
                searchable
                label="Height field"
                placeholder="Pick one"
                value={extrusionHeightField ?? null}
                options={fields}
                onChange={value => {
                    if (value) {
                        dispatch(actions.layer.setExtrusionOptions({ id: layerId, heightField: value }))
                    }
                }}
            />
            <SliderField
                label="Base"
                min={0}
                max={10}
                value={extrusionBase}
                onChange={value => dispatch(actions.layer.setExtrusionOptions({ id: layerId, base: value }))}
            />
            <Select
                searchable
                label="Base field"
                placeholder="Pick one"
                value={extrusionBaseField ?? null}
                options={fields}
                onChange={value => {
                    if (value) {
                        dispatch(actions.layer.setExtrusionOptions({ id: layerId, baseField: value }))
                    }
                }}
            />
        </>
    )
}
