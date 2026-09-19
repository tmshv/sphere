import { Group, Text } from "@mantine/core"
import type { FC, ReactNode } from "react"

export type InfoRowProps = {
    label: string
    value: ReactNode
}

export const InfoRow: FC<InfoRowProps> = ({ label, value }) => {
    return (
        <Group position={"apart"} spacing={"xs"} noWrap>
            <Text size={"xs"} color={"dimmed"}>
                {label}
            </Text>
            <Text size={"xs"}>{value}</Text>
        </Group>
    )
}
