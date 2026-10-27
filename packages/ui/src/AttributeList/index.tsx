import { Stack } from "../Layout"
import { Text } from "../Text"
import s from "./attribute-list.module.css"
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

export function AttributeList({ fields }: AttributeListProps) {
    if (fields.length === 0) {
        return (
            <div className={s.root}>
                <Text tone="dimmed">No attributes</Text>
            </div>
        )
    }
    return (
        <Stack className={s.root} gap="sm">
            {fields.map(field => (
                <FieldRow key={field.name} field={field} />
            ))}
        </Stack>
    )
}
