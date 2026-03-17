import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec"
import { StyleSpecification } from "maplibre-gl"

export function isStyle(value: object): boolean {
    const errors = validateStyleMin(value as StyleSpecification)
    return errors.length === 0
}
