import { Stack, Text } from "@mantine/core"
import type { FC } from "react"
import type { FieldEntry } from "@/store/sourceInfo/selectors"
import { FieldRow } from "./FieldRow"

export type AttributeListProps = {
    fields: FieldEntry[]
}

export const AttributeList: FC<AttributeListProps> = ({ fields }) => {
    if (fields.length === 0) {
        return (
            <Text size={"xs"} color={"dimmed"}>
                No attributes
            </Text>
        )
    }
    return (
        <Stack spacing={"sm"}>
            {fields.map(field => (
                <FieldRow key={field.name} field={field} />
            ))}
        </Stack>
    )
}
