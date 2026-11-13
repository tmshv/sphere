import type { Meta, StoryObj } from "@storybook/react-vite"
import { useRef } from "react"
import { fn } from "storybook/test"
import { RadioListField } from "../RadioListField"
import { SliderField } from "../SliderField"
import { SwitchField } from "../SwitchField"
import {
    POPOVER_SECTION_TITLES,
    POPOVER_TITLE,
    RADIO_LIST_LABEL,
    RADIO_LIST_OPTIONS,
    SLIDER_LABEL,
    SLIDER_MAX,
    SLIDER_MIN,
    SLIDER_STEP,
    SLIDER_VALUE,
    SWITCH_LABEL,
} from "../stories/fixtures"
import { overlayFrameStyle, popoverAnchorStyle } from "../stories/layout"
import { Popover, type PopoverProps, PopoverSection } from "."

type PopoverDemoProps = Omit<PopoverProps, "anchor">

// The anchor stands in for the statusbar button the popover opens above.
function PopoverDemo({ open, onClose, children }: PopoverDemoProps) {
    const anchor = useRef<HTMLDivElement>(null)

    return (
        <div style={overlayFrameStyle}>
            <div ref={anchor} style={popoverAnchorStyle} />
            <Popover open={open} anchor={anchor} onClose={onClose}>
                {children}
            </Popover>
        </div>
    )
}

const meta = {
    title: "Containers/Popover",
    component: PopoverDemo,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    args: {
        open: true,
        onClose: fn(),
        children: POPOVER_TITLE,
    },
} satisfies Meta<typeof PopoverDemo>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithSections: Story = {
    args: {
        children: (
            <>
                <PopoverSection title={POPOVER_SECTION_TITLES.first}>
                    <RadioListField
                        label={RADIO_LIST_LABEL}
                        value={RADIO_LIST_OPTIONS.at(0)?.value}
                        options={[...RADIO_LIST_OPTIONS]}
                        onChange={fn()}
                    />
                </PopoverSection>
                <PopoverSection title={POPOVER_SECTION_TITLES.second}>
                    <SwitchField label={SWITCH_LABEL} checked onChange={fn()} />
                </PopoverSection>
            </>
        ),
    },
}

export const WithFields: Story = {
    args: {
        children: (
            <>
                <RadioListField
                    label={RADIO_LIST_LABEL}
                    value={RADIO_LIST_OPTIONS.at(0)?.value}
                    options={[...RADIO_LIST_OPTIONS]}
                    onChange={fn()}
                />
                <SliderField
                    label={SLIDER_LABEL}
                    value={SLIDER_VALUE}
                    min={SLIDER_MIN}
                    max={SLIDER_MAX}
                    step={SLIDER_STEP}
                    onChange={fn()}
                />
                <SwitchField label={SWITCH_LABEL} checked onChange={fn()} />
            </>
        ),
    },
}
