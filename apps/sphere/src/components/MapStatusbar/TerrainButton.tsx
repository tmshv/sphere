import {
    HILLSHADE_ALTITUDE,
    HILLSHADE_ANCHORS,
    HILLSHADE_DIRECTION,
    HILLSHADE_INTENSITY,
    HILLSHADE_METHODS,
    TERRAIN_EXAGGERATION,
    hillshadeAnchorOf,
    hillshadeMethodOf,
} from "@/lib/terrain"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
    selectHasTerrainSource,
    selectHillshadeSettings,
    selectIsShowHillshade,
    selectIsShowTerrain,
    selectTerrainExaggeration,
    selectTerrainSource,
    selectTerrainSourceOptions,
} from "@/store/terrain"
import type { HillshadeSettings } from "@/types/terrain"
import { IconMountain, IconMountainOff } from "@sphere/icons"
import {
    ColorField,
    PopoverSection,
    RadioListField,
    Select,
    SliderField,
    StatusbarButton,
    StatusbarPopover,
    SwitchField,
} from "@sphere/ui"
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
    const settings = useAppSelector(selectHillshadeSettings)

    function update(patch: Partial<HillshadeSettings>) {
        dispatch(actions.terrain.updateHillshade(patch))
    }

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
            <StatusbarPopover open={open} anchor={anchor} onClose={() => setOpen(false)}>
                <PopoverSection title="Terrain">
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
                </PopoverSection>
                <PopoverSection title="Hillshade">
                    <SwitchField
                        label="Show hillshade"
                        checked={hillshade}
                        onChange={checked => dispatch(actions.terrain.setHillshade(checked))}
                    />
                    <SliderField
                        label="Intensity"
                        value={settings.intensity}
                        {...HILLSHADE_INTENSITY}
                        onChange={intensity => update({ intensity })}
                    />
                    <Select
                        label="Method"
                        value={settings.method}
                        options={HILLSHADE_METHODS}
                        onChange={value => {
                            const method = hillshadeMethodOf(value)
                            if (method) update({ method })
                        }}
                    />
                    <SliderField
                        label="Light direction"
                        value={settings.direction}
                        {...HILLSHADE_DIRECTION}
                        onChange={direction => update({ direction })}
                    />
                    <SliderField
                        label="Light altitude"
                        value={settings.altitude}
                        {...HILLSHADE_ALTITUDE}
                        onChange={altitude => update({ altitude })}
                    />
                    <RadioListField
                        label="Light follows"
                        value={settings.anchor}
                        options={HILLSHADE_ANCHORS}
                        onChange={value => {
                            const anchor = hillshadeAnchorOf(value)
                            if (anchor) update({ anchor })
                        }}
                    />
                    <ColorField
                        label="Shadow"
                        value={settings.shadowColor}
                        onChange={shadowColor => update({ shadowColor })}
                    />
                    <ColorField
                        label="Highlight"
                        value={settings.highlightColor}
                        onChange={highlightColor => update({ highlightColor })}
                    />
                    <ColorField
                        label="Accent"
                        value={settings.accentColor}
                        onChange={accentColor => update({ accentColor })}
                    />
                </PopoverSection>
            </StatusbarPopover>
        </>
    )
}
