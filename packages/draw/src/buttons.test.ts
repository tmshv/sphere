import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import MapLibreDraw from "./index"
import createMap, { type MockMap } from "./test-utils/create-map"
import { backspaceEvent, startPointEvent } from "./test-utils/key-events"
import required from "./test-utils/required"
import waitForLoad from "./test-utils/wait-for-load"

const BUTTON_CLASS = "maplibre-gl-draw_ctrl-draw-btn"

describe("buttons option", () => {
    const container = document.createElement("div")
    let map: MockMap
    let draw: MapLibreDraw
    let control: HTMLElement | null = null

    beforeAll(async () => {
        document.body.appendChild(container)
        map = createMap({ container })
        draw = new MapLibreDraw({
            buttons: false,
            displayControlsDefault: false,
            controls: { point: true, trash: true },
        })
        const onAdd = draw.onAdd.bind(draw)
        draw.onAdd = m => {
            control = onAdd(m)
            return control
        }
        map.addControl(draw)
        await waitForLoad(map)
    })

    afterAll(() => {
        container.remove()
    })

    it("returns an empty element and renders no button", () => {
        expect(required(control, "control was not added").childElementCount).toBe(0)
        expect(container.querySelector(`.${BUTTON_CLASS}`)).toBeNull()
    })

    it("starts a tool with its key", () => {
        const fire = vi.spyOn(map, "fire")
        container.dispatchEvent(startPointEvent())
        expect(draw.getMode()).toBe("draw_point")
        expect(fire.mock.calls.some(([name]) => name === "draw.modechange")).toBe(true)
    })

    it("deletes the selected feature with Delete", () => {
        draw.changeMode("simple_select")
        const [id] = draw.add({ type: "Point", coordinates: [0, 0] })
        draw.changeMode("simple_select", { featureIds: [String(id)] })
        container.dispatchEvent(backspaceEvent())
        expect(draw.getAll().features).toHaveLength(0)
    })

    it("removes the control cleanly", () => {
        draw.onRemove()
        expect(container.querySelector(`.${BUTTON_CLASS}`)).toBeNull()
    })
})
