import { Stack, Text } from "@mantine/core"
import type { FC, ReactNode } from "react"

export type PanelSectionProps = {
    title: string
    children: ReactNode
}

export const PanelSection: FC<PanelSectionProps> = ({ title, children }) => {
    return (
        <Stack spacing={4}>
            <Text size={"xs"} weight={600} transform={"uppercase"} color={"dimmed"}>
                {title}
            </Text>
            {children}
        </Stack>
    )
}
