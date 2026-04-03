import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { Badge, ColorPicker, Input } from "@mantine/core"
import type { FC } from "react"

type PolygonControlsProps = {
    layerId: string
    color: string
}

export const PolygonControls: FC<PolygonControlsProps> = ({ layerId, color }) => {
    const dispatch = useAppDispatch()

    return (
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
    )
}
