import { isValidFilterExpression } from "@/lib/maplibre"
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { IconButton, TextField } from "@sphere/ui"
import { IconX } from "@tabler/icons"
import type { FilterSpecification } from "maplibre-gl"
import { useState } from "react"

const CLEAR_ICON_SIZE = 10

type LayerFilterProps = {
    layerId: string
    filterExpression: FilterSpecification | null
    filterError: string | null
}

export function LayerFilter({ layerId, filterExpression, filterError }: LayerFilterProps) {
    const dispatch = useAppDispatch()
    const [filterText, setFilterText] = useState(filterExpression ? JSON.stringify(filterExpression) : "")
    const [filterLocalError, setFilterLocalError] = useState<string | null>(null)

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
        <div onBlur={handleFilterBlur}>
            <TextField
                code
                label="Filter"
                placeholder='["==", ["get", "field"], "value"]'
                value={filterText}
                error={filterLocalError ?? filterError ?? undefined}
                rightSection={
                    filterText ? (
                        <IconButton
                            size="sm"
                            icon={<IconX size={CLEAR_ICON_SIZE} />}
                            label="Clear filter"
                            onClick={clearFilter}
                        />
                    ) : null
                }
                onChange={handleFilterChange}
            />
        </div>
    )
}
