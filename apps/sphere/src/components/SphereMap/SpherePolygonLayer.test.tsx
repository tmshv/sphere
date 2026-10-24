import { render } from "@testing-library/react"
import type { LayerProps } from "react-map-gl/maplibre"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SpherePolygonLayer } from "./SpherePolygonLayer"

const rendered: LayerProps[] = []

vi.mock("react-map-gl/maplibre", () => ({
    Layer: (props: LayerProps) => {
        rendered.push(props)
        return null
    },
}))

describe("SpherePolygonLayer", () => {
    beforeEach(() => {
        rendered.length = 0
    })

    it("draws its MapLibre layers bottom to top", () => {
        render(<SpherePolygonLayer layerId="parks" sourceId="s" color="red" visible={true} beforeId="above" />)

        expect(rendered.map(props => props.id)).toEqual(["parks", "parks-outline-0", "parks-outline-1"])
    })

    it("places every layer before the given layer", () => {
        render(<SpherePolygonLayer layerId="parks" sourceId="s" color="red" visible={true} beforeId="above" />)

        expect(rendered.length).toBeGreaterThan(0)
        expect(rendered.map(props => props.beforeId)).toEqual(rendered.map(() => "above"))
    })
})
