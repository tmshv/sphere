import { Badge, ColorPicker, Input } from "@mantine/core"

const FIELD_SIZE = "xs"
const BADGE_RADIUS = "sm"
const BADGE_MARGIN_LEFT = "xs"
const PICKER_FORMAT = "hex"
const PICKER_WIDTH = "100%"
const SATURATION_HEIGHT_PX = 130

export type ColorFieldProps = {
    label: string
    value: string
    onChange: (hex: string) => void
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
    return (
        <Input.Wrapper
            label={
                <>
                    {label}
                    <Badge ml={BADGE_MARGIN_LEFT} size={FIELD_SIZE} radius={BADGE_RADIUS}>
                        {value}
                    </Badge>
                </>
            }
            size={FIELD_SIZE}
        >
            <ColorPicker
                format={PICKER_FORMAT}
                size={FIELD_SIZE}
                value={value}
                styles={theme => ({
                    wrapper: { width: PICKER_WIDTH },
                    saturation: { height: SATURATION_HEIGHT_PX },
                    slider: { marginTop: theme.spacing.sm },
                })}
                onChange={onChange}
            />
        </Input.Wrapper>
    )
}
