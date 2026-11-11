import { TERRAIN_EXAGGERATION } from "@/lib/terrain"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
    selectHasTerrainSource,
    selectIsShowHillshade,
    selectIsShowTerrain,
    selectTerrainExaggeration,
    selectTerrainSource,
    selectTerrainSourceOptions,
} from "@/store/terrain"
import { IconMountain, IconMountainOff } from "@sphere/icons"
import { Popover, RadioListField, SliderField, StatusbarButton, SwitchField } from "@sphere/ui"
import { useRef, useState } from "react"

const ICON_SIZE_PX = 16

export function TerrainButton() {
    const dispatch = useAppDispatch()
    const anchor = useRef<HTMLButtonElement>(null)
    const [open, setOpen] = useState(false)

    const show = useAppSelector(selectIsShowTerrain)
    const hasSource = useAppSelector(selectHasTerrainSource)
    const source = useAppSelector(selectTerrainSource)
    const options = useAppSelector(selectTerrainSourceOptions)
    const exaggeration = useAppSelector(selectTerrainExaggeration)
    const hillshade = useAppSelector(selectIsShowHillshade)

    return (
        <>
            <StatusbarButton
                ref={anchor}
                icon={show ? <IconMountain size={ICON_SIZE_PX} /> : <IconMountainOff size={ICON_SIZE_PX} />}
                label="Terrain"
                active={show}
                disabled={!hasSource}
                onClick={() => dispatch(actions.terrain.toggle())}
                onContextMenu={() => setOpen(true)}
            />
            <Popover open={open} anchor={anchor} onClose={() => setOpen(false)}>
                <RadioListField
                    label="Source"
                    value={source?.id}
                    options={options}
                    onChange={id => dispatch(actions.terrain.pick(id))}
                />
                <SliderField
                    label="Exaggeration"
                    value={exaggeration}
                    min={TERRAIN_EXAGGERATION.min}
                    max={TERRAIN_EXAGGERATION.max}
                    step={TERRAIN_EXAGGERATION.step}
                    onChange={value => dispatch(actions.terrain.setExaggeration(value))}
                />
                <SwitchField
                    label="Hillshade"
                    checked={hillshade}
                    onChange={checked => dispatch(actions.terrain.setHillshade(checked))}
                />
            </Popover>
        </>
    )
}
