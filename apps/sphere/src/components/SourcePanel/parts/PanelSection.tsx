import { NO_SELECT, Stack, Text } from "@sphere/ui"
import type { ReactNode } from "react"

export type PanelSectionProps = {
    title: string
    children: ReactNode
}

export function PanelSection({ title, children }: PanelSectionProps) {
    return (
        <Stack gap={"xs"}>
            <Text weight={"semibold"} uppercase tone={"dimmed"} style={NO_SELECT}>
                {title}
            </Text>
            {children}
        </Stack>
    )
}
