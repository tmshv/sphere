import { Stack, Text, createStyles } from "@mantine/core"
import type { FC } from "react"
import { FieldRow } from "./FieldRow"

/**
 * The value summary for one field.
 *
 * `loading` and `error` are states rather than data, so a consumer can render a
 * field before its statistics have arrived — or when they never will.
 */
export type FieldSummary =
    | { kind: "loading" }
    | { kind: "error" }
    | { kind: "numeric"; min?: number; max?: number; mean?: number; histogram: number[] }
    | { kind: "string"; unique: number; topValues: [string, number][] }

/** One attribute of whatever the consumer is describing: a name, a type and a summary. */
export type FieldEntry = {
    name: string
    type: string
    nullCount?: number
    summary: FieldSummary
}

export type AttributeListProps = {
    fields: FieldEntry[]
}

const useStyle = createStyles(() => ({
    root: {
        userSelect: "none",
    },
}))

export const AttributeList: FC<AttributeListProps> = ({ fields }) => {
    const { classes } = useStyle()

    if (fields.length === 0) {
        return (
            <Text className={classes.root} size={"xs"} color={"dimmed"}>
                No attributes
            </Text>
        )
    }
    return (
        <Stack className={classes.root} spacing={"sm"}>
            {fields.map(field => (
                <FieldRow key={field.name} field={field} />
            ))}
        </Stack>
    )
}
