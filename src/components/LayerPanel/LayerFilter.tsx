import { isValidFilterExpression } from "@/lib/maplibre"
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { ActionIcon, TextInput } from "@mantine/core"
import { IconX } from "@tabler/icons"
import type { FilterSpecification } from "maplibre-gl"
import { type FC, useEffect, useState } from "react"

type LayerFilterProps = {
    layerId: string
    filterExpression: FilterSpecification | null
    filterError: string | null
}

export const LayerFilter: FC<LayerFilterProps> = ({ layerId, filterExpression, filterError }) => {
    const dispatch = useAppDispatch()
    const [filterText, setFilterText] = useState("")
    const [filterLocalError, setFilterLocalError] = useState<string | null>(null)

    useEffect(() => {
        setFilterText(filterExpression ? JSON.stringify(filterExpression) : "")
        setFilterLocalError(null)
    }, [filterExpression])

    function handleFilterChange(text: string) {
        setFilterText(text)
        if (!text.trim()) {
            setFilterLocalError(null)
            dispatch(actions.layer.setLayerFilter({ id: layerId, expression: null }))
            return
        }
        try {
            const expression = JSON.parse(text)
            if (Array.isArray(expression) && isValidFilterExpression(expression)) {
                setFilterLocalError(null)
                dispatch(actions.layer.setLayerFilter({ id: layerId, expression: expression as FilterSpecification }))
            }
        } catch {
            // don't show error while typing
        }
    }

    function handleFilterBlur() {
        if (!filterText.trim()) return
        try {
            const expression = JSON.parse(filterText)
            if (!Array.isArray(expression)) {
                setFilterLocalError("Filter must be a JSON array")
            } else if (!isValidFilterExpression(expression)) {
                setFilterLocalError("Invalid filter expression")
            }
        } catch {
            setFilterLocalError("Invalid JSON expression")
        }
    }

    function clearFilter() {
        setFilterText("")
        setFilterLocalError(null)
        dispatch(actions.layer.setLayerFilter({ id: layerId, expression: null }))
    }

    return (
        <TextInput
            size="xs"
            label="Filter"
            placeholder='["==", ["get", "field"], "value"]'
            value={filterText}
            error={filterLocalError ?? filterError ?? undefined}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            rightSection={
                filterText ? (
                    <ActionIcon size="xs" onClick={clearFilter}>
                        <IconX size={10} />
                    </ActionIcon>
                ) : null
            }
            onChange={e => handleFilterChange(e.currentTarget.value)}
            onBlur={handleFilterBlur}
        />
    )
}
