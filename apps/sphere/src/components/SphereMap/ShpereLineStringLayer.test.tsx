import { render } from "@testing-library/react"
import type { LayerProps } from "react-map-gl/maplibre"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SphereLineStringLayer } from "./ShpereLineStringLayer"

const rendered: LayerProps[] = []

vi.mock("react-map-gl/maplibre", () => ({
    Layer: (props: LayerProps) => {
        rendered.push(props)
        return null
    },
}))

describe("SphereLineStringLayer", () => {
    beforeEach(() => {
        rendered.length = 0
    })

    it("draws its MapLibre layers bottom to top", () => {
        render(
            <SphereLineStringLayer
                layerId="roads"
                sourceId="s"
                color="red"
                visible={true}
                thick={false}
                beforeId="above"
            />,
        )

        expect(rendered.map(props => props.id)).toEqual(["roads-outline", "roads"])
    })

    it("places every layer before the given layer", () => {
        render(
            <SphereLineStringLayer
                layerId="roads"
                sourceId="s"
                color="red"
                visible={true}
                thick={false}
                beforeId="above"
            />,
        )

        expect(rendered.length).toBeGreaterThan(0)
        expect(rendered.map(props => props.beforeId)).toEqual(rendered.map(() => "above"))
    })
})
