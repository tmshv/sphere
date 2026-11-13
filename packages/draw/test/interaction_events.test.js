// These tests ensure that user interactions fire the right events

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import MapboxDraw from "../index"
import createAfterNextRender from "./utils/after_next_render"
import createMap from "./utils/create_map"
import { backspaceEvent, enterEvent, escapeEvent } from "./utils/key_events"
import makeMouseEvent from "./utils/make_mouse_event"
import click from "./utils/mouse_click"
import waitForLoad from "./utils/wait_for_load"

describe("interaction events", () => {
    const container = document.createElement("div")
    let map
    let fireSpy
    let afterNextRender
    let Draw
    let controlGroup = null
    let pointButton
    let lineCutton
    let trashButton
    let polygonEutton

    beforeAll(async () => {
        document.body.appendChild(container)
        map = createMap({ container })
        fireSpy = vi.spyOn(map, "fire")
        afterNextRender = createAfterNextRender(map)
        Draw = new MapboxDraw()
        const onAdd = Draw.onAdd.bind(Draw)
        Draw.onAdd = m => {
            controlGroup = onAdd(m)
            return controlGroup
        }

        map.addControl(Draw)
        await waitForLoad(map)

        pointButton = controlGroup.getElementsByClassName("maplibre-gl-draw_point")[0]
        lineCutton = controlGroup.getElementsByClassName("maplibre-gl-draw_line")[0]
        trashButton = controlGroup.getElementsByClassName("maplibre-gl-draw_trash")[0]
        polygonEutton = controlGroup.getElementsByClassName("maplibre-gl-draw_polygon")[0]
    })

    afterAll(() => {
        container.remove()
    })

    function flushDrawEvents() {
        const drawEvents = []
        for (const [eventName] of fireSpy.mock.calls) {
            if (typeof eventName !== "string" || eventName.indexOf("draw.") !== 0) continue
            // Ignore draw.render events for now
            if (eventName === "draw.render") continue
            // Ignore draw.actionable events for now
            if (eventName === "draw.actionable") continue
            drawEvents.push(eventName)
        }
        fireSpy.mockClear()
        return drawEvents
    }

    function getEventCall(eventName) {
        return fireSpy.mock.calls.find(args => args[0] === eventName)
    }

    function firedWith(eventName, expectedEventData) {
        const args = getEventCall(eventName)
        if (!args) {
            expect.fail(`${eventName} never called`)
            return {}
        }
        expect(true, `${eventName} called`).toBe(true)
        const actualEventData = { ...args[1] }

        if (actualEventData.features) {
            actualEventData.features = actualEventData.features.map(withoutId)
        }
        expect(actualEventData, "with correct data").toEqual(expectedEventData)
        return args[1]
    }

    function withoutId(obj) {
        return Object.fromEntries(Object.entries(obj).filter(([key]) => key !== "id"))
    }

    function repeat(count, fn) {
        for (let i = 1; i <= count; i++) {
            fn(i)
        }
    }

    // The sequence of these tests matters: each uses state established
    // in the prior tests. These variables keep track of bits of that state.

    it("enter draw_point mode", () => {
        fireSpy.mockClear()

        // Click the line button
        pointButton.click()
        firedWith("draw.modechange", {
            mode: "draw_point",
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.modechange"])
    })

    const pointA = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Point",
            coordinates: [25, 25],
        },
    }

    it("create a point", async () => {
        // Now in `draw_point` mode ...
        // Move around, then click to create the point
        map.fire("mousemove", makeMouseEvent(10, 10))
        map.fire("mousemove", makeMouseEvent(20, 20))
        click(map, makeMouseEvent(25, 25))
        await afterNextRender()
        firedWith("draw.create", {
            features: [pointA],
        })

        firedWith("draw.modechange", {
            mode: "simple_select",
        })

        firedWith("draw.selectionchange", {
            features: [pointA],
            points: [],
        })

        expect(flushDrawEvents(), "no unexpected draw events").toEqual([
            "draw.create",
            "draw.modechange",
            "draw.selectionchange",
        ])
    })

    it("deselect that point", async () => {
        // Now in `simple_select` mode ...
        // Move around, then click away from the selected point
        map.fire("mousemove", makeMouseEvent(10, 10))
        map.fire("mousemove", makeMouseEvent(20, 20))
        click(map, makeMouseEvent(5, 5))
        await afterNextRender()
        firedWith("draw.selectionchange", {
            features: [],
            points: [],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.selectionchange"])
    })

    it("re-select that point", async () => {
        // Now in `simple_select` mode ...
        // Move around, then click the existing point
        map.fire("mousemove", makeMouseEvent(10, 10))
        map.fire("mousemove", makeMouseEvent(20, 20))
        click(map, makeMouseEvent(25, 25))
        await afterNextRender()
        firedWith("draw.selectionchange", {
            features: [pointA],
            points: [],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.selectionchange"])
    })

    const pointB = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Point",
            coordinates: [35, 15],
        },
    }

    it("drag that point", async () => {
        // Now in `simple_select` mode ...
        map.fire("mousedown", makeMouseEvent(25, 25))
        repeat(10, i => {
            map.fire("mousemove", makeMouseEvent(25 + i, 25 - i, { buttons: 1 }))
        })
        map.fire("mouseup", makeMouseEvent(35, 10))
        await afterNextRender()
        firedWith("draw.update", {
            action: "move",
            features: [pointB],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.update"])
    })

    it("delete that point with the Trash button", async () => {
        // Now in `simple_select` mode ...
        trashButton.click()
        await afterNextRender()
        firedWith("draw.delete", {
            features: [pointB],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.delete"])
    })

    it("enter draw_line_string mode", () => {
        // Click the line button
        lineCutton.click()
        firedWith("draw.modechange", {
            mode: "draw_line_string",
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.modechange"])
    })

    const lineA = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: [
                [10, 10],
                [30, 30],
                [50, 50],
            ],
        },
    }

    it("create a line", async () => {
        // Now in `draw_line_string` mode...
        // Move around, then click and move to create the line
        map.fire("mousemove", makeMouseEvent(10, 10))
        map.fire("mousemove", makeMouseEvent(20, 20))
        click(map, makeMouseEvent(10, 10))
        repeat(20, i => {
            map.fire("mousemove", makeMouseEvent(10 + i, 10 + i))
        })
        click(map, makeMouseEvent(30, 30))
        repeat(20, i => {
            map.fire("mousemove", makeMouseEvent(30 + i, 30 + i))
        })
        click(map, makeMouseEvent(50, 50))
        click(map, makeMouseEvent(50, 50))

        await afterNextRender()
        firedWith("draw.create", {
            features: [lineA],
        })

        firedWith("draw.modechange", {
            mode: "simple_select",
        })

        firedWith("draw.selectionchange", {
            features: [lineA],
            points: [],
        })

        expect(flushDrawEvents(), "no unexpected draw events").toEqual([
            "draw.create",
            "draw.modechange",
            "draw.selectionchange",
        ])
    })

    it("deselect that line", async () => {
        // Now in `simple_select` mode ...
        click(map, makeMouseEvent(5, 5))
        await afterNextRender()
        firedWith("draw.selectionchange", {
            features: [],
            points: [],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.selectionchange"])
    })

    it("re-select that line", async () => {
        // Now in `simple_select` mode ...
        // Click somewhere on the line
        click(map, makeMouseEvent(30, 30))
        await afterNextRender()
        firedWith("draw.selectionchange", {
            features: [lineA],
            points: [],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.selectionchange"])
    })

    const lineB = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: [
                [20, 0],
                [40, 20],
                [60, 40],
            ],
        },
    }

    it("move the line", async () => {
        // Now in `simple_select` mode ...
        // Mousedown anywhere on the line, not vertex
        map.fire("mousedown", makeMouseEvent(20, 20))
        // Drag it a little bit
        repeat(10, i => {
            map.fire("mousemove", makeMouseEvent(20 + i, 20 - i, { buttons: 1 }))
        })
        // Release the mouse
        map.fire("mouseup", makeMouseEvent(40, 0))

        await afterNextRender()
        firedWith("draw.update", {
            action: "move",
            features: [lineB],
        })

        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.update"])
    })

    it("select a vertex", async () => {
        // Now in `simple_select` mode ...
        // Click a vertex
        click(map, makeMouseEvent(40, 20))
        await afterNextRender()
        firedWith("draw.modechange", {
            mode: "direct_select",
        })

        firedWith("draw.selectionchange", {
            features: [lineB],
            points: [
                {
                    geometry: {
                        coordinates: [40, 20],
                        type: "Point",
                    },
                    properties: {},
                    type: "Feature",
                },
            ],
        })

        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.modechange", "draw.selectionchange"])
    })

    const lineC = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: [
                [20, 0],
                [62, 42],
                [60, 40],
            ],
        },
    }

    it("move the vertex", async () => {
        // Now in `direct_select` mode ...
        // Click the vertex again
        map.fire("mousedown", makeMouseEvent(40, 20))
        // Drag it a little bit
        repeat(22, i => {
            map.fire("mousemove", makeMouseEvent(40 + i, 20 + i, { buttons: 1 }))
        })
        // Release the mouse
        map.fire("mouseup", makeMouseEvent(60, 40))
        await afterNextRender()
        firedWith("draw.update", {
            action: "change_coordinates",
            features: [lineC],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.update", "draw.selectionchange"])
    })

    const lineD = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: [
                [20, 0],
                [41, 21],
                [62, 42],
                [60, 40],
            ],
        },
    }

    it("add another vertex", async () => {
        // Now in `direct_select` mode ...
        // Click a midpoint of lineC
        click(map, makeMouseEvent(41, 21))
        await afterNextRender()
        firedWith("draw.update", {
            action: "change_coordinates",
            features: [lineD],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.update"])
    })

    const lineE = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: [
                [20, 0],
                [62, 42],
                [60, 40],
            ],
        },
    }

    it("delete a vertex with Backspace", async () => {
        // Now in `direct_select` mode ...
        // Click a vertex
        click(map, makeMouseEvent(41, 21))
        container.dispatchEvent(backspaceEvent())
        await afterNextRender()
        firedWith("draw.update", {
            action: "change_coordinates",
            features: [lineE],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.update", "draw.selectionchange"])
    })

    // Leaving that line in place while moving on to
    // mess with polygons

    it("enter draw_polygon mode", async () => {
        // Click the polygon button
        polygonEutton.click()

        await afterNextRender()
        firedWith("draw.modechange", {
            mode: "draw_polygon",
        })

        firedWith("draw.selectionchange", {
            features: [],
            points: [],
        })

        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.modechange", "draw.selectionchange"])
    })

    const polygonA = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [0, 0],
                    [0, 30],
                    [30, 30],
                    [30, 0],
                    [0, 0],
                ],
            ],
        },
    }

    it("create a polygon", async () => {
        // Now in `draw_polygon` mode ...
        click(map, makeMouseEvent(0, 0))
        repeat(20, i => {
            map.fire("mousemove", makeMouseEvent(0, 0 + i))
        })
        click(map, makeMouseEvent(0, 30))
        repeat(20, i => {
            map.fire("mousemove", makeMouseEvent(0 + i, 30))
        })
        click(map, makeMouseEvent(30, 30))
        repeat(20, i => {
            map.fire("mousemove", makeMouseEvent(30, 30 - i))
        })
        click(map, makeMouseEvent(30, 0))
        click(map, makeMouseEvent(30, 0))

        await afterNextRender()
        firedWith("draw.create", {
            features: [polygonA],
        })

        firedWith("draw.modechange", {
            mode: "simple_select",
        })

        firedWith("draw.selectionchange", {
            features: [polygonA],
            points: [],
        })

        expect(flushDrawEvents(), "no unexpected draw events").toEqual([
            "draw.create",
            "draw.modechange",
            "draw.selectionchange",
        ])
    })

    it("deselect the polygon", async () => {
        // Now in `simple_select` mode ...
        click(map, makeMouseEvent(-10, -10))
        await afterNextRender()
        firedWith("draw.selectionchange", {
            features: [],
            points: [],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.selectionchange"])
    })

    it("box-select the line and the polygon", async () => {
        // Now in `simple_select` mode ...
        // Mouse down with the shift key
        map.fire("mousedown", makeMouseEvent(200, 200, { shiftKey: true }))
        repeat(20, i => {
            map.fire("mousemove", makeMouseEvent(200 - 10 * i, 200 - 10 * i, { buttons: 1 }))
        })
        map.fire("mouseup", makeMouseEvent(0, 0))

        await afterNextRender()
        firedWith("draw.selectionchange", {
            features: [lineE, polygonA],
            points: [],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.selectionchange"])
    })

    const lineF = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: [
                [40, -20],
                [82, 22],
                [80, 20],
            ],
        },
    }

    const polygonB = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [20, -20],
                    [20, 10],
                    [50, 10],
                    [50, -20],
                    [20, -20],
                ],
            ],
        },
    }

    it("move the line and the polygon", async () => {
        // Now in `simple_select` mode ...
        // Mousedown anywhere on either feature, not a vertex
        map.fire("mousedown", makeMouseEvent(0, 15))
        // Drag it a little bit
        repeat(20, i => {
            map.fire("mousemove", makeMouseEvent(0 + i, 15 - i, { buttons: 1 }))
        })
        // Release the mouse
        map.fire("mouseup", makeMouseEvent(20, -5))

        await afterNextRender()
        firedWith("draw.update", {
            action: "move",
            features: [lineF, polygonB],
        })

        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.update"])
    })

    it("deselect both", async () => {
        // Now in `simple_select` mode ...
        click(map, makeMouseEvent(-10, -10))
        await afterNextRender()
        firedWith("draw.selectionchange", {
            features: [],
            points: [],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.selectionchange"])
    })

    it("select the polygon", async () => {
        // Now in `simple_select` mode ...
        click(map, makeMouseEvent(48, 0))
        await afterNextRender()
        firedWith("draw.selectionchange", {
            features: [polygonB],
            points: [],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.selectionchange"])
    })

    it("select a vertex (polygon)", async () => {
        // Now in `simple_select` mode ...
        click(map, makeMouseEvent(20, -20))
        await afterNextRender()
        firedWith("draw.modechange", {
            mode: "direct_select",
        })

        firedWith("draw.selectionchange", {
            features: [polygonB],
            points: [
                {
                    geometry: {
                        coordinates: [20, -20],
                        type: "Point",
                    },
                    properties: {},
                    type: "Feature",
                },
            ],
        })

        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.modechange", "draw.selectionchange"])
    })

    it("add another vertex to the selection", async () => {
        // Now in `simple_select` mode ...
        click(map, makeMouseEvent(20, 10, { shiftKey: true }))
        await afterNextRender()
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.selectionchange"])
    })

    const polygonC = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [0, -20],
                    [0, 10],
                    [50, 10],
                    [50, -20],
                    [0, -20],
                ],
            ],
        },
    }

    it("move the vertices", async () => {
        // Now in `direct_select` mode ...
        // Click a vertex again
        map.fire("mousedown", makeMouseEvent(20, 10))
        // Drag it a little bit
        repeat(20, i => {
            map.fire("mousemove", makeMouseEvent(20 - i, 10, { buttons: 1 }))
        })
        // Release the mouse
        map.fire("mouseup", makeMouseEvent(0, 10))

        await afterNextRender()
        firedWith("draw.update", {
            action: "change_coordinates",
            features: [polygonC],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.update", "draw.selectionchange"])
    })

    const polygonD = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [0, -20],
                    [0, 10],
                    [25, 10],
                    [50, 10],
                    [50, -20],
                    [0, -20],
                ],
            ],
        },
    }

    it("add another vertex (polygon)", async () => {
        // Now in `direct_select` mode ...
        // Click a midpoint
        click(map, makeMouseEvent(25, 10))
        await afterNextRender()
        firedWith("draw.update", {
            action: "change_coordinates",
            features: [polygonD],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.update"])
    })

    const polygonE = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [0, 10],
                    [50, 10],
                    [50, -20],
                    [0, 10],
                ],
            ],
        },
    }

    it("select then delete two vertices with Draw.trash()", async () => {
        // Now in `direct_select` mode ...
        click(map, makeMouseEvent(0, -20))
        click(map, makeMouseEvent(25, 10, { shiftKey: true }))
        Draw.trash()
        await afterNextRender()
        firedWith("draw.update", {
            action: "change_coordinates",
            features: [polygonE],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.update", "draw.selectionchange"])
    })

    it("select the polygon (again)", async () => {
        // Deselect everything
        click(map, makeMouseEvent(-200, -200))
        await afterNextRender()
        flushDrawEvents()
        // Now in `simple_select` mode ...
        // Click the polygon
        click(map, makeMouseEvent(50, 10))
        await afterNextRender()
        firedWith("draw.selectionchange", {
            features: [polygonE],
            points: [],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.selectionchange"])
    })

    it("add the line to the selection", async () => {
        // Now in `simple_select` mode ...
        // shift-click to add to selection
        click(map, makeMouseEvent(82, 22, { shiftKey: true }))
        await afterNextRender()
        firedWith("draw.selectionchange", {
            features: [polygonE, lineF],
            points: [],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.selectionchange"])
    })

    // Below are tests to ensure that API usage to modify data does not
    // trigger events, only user interactions
    it("API usage does not trigger events", async () => {
        Draw.deleteAll()
        Draw.add({
            type: "Feature",
            id: "point",
            properties: {},
            geometry: {
                type: "Point",
                coordinates: [10, 10],
            },
        })
        Draw.add({
            type: "Feature",
            id: "line",
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: [
                    [10, 10],
                    [20, 20],
                ],
            },
        })
        Draw.changeMode("draw_point")
        Draw.changeMode("draw_line_string")
        Draw.changeMode("draw_polygon")
        Draw.changeMode("simple_select")
        Draw.delete("point")
        await afterNextRender()
        expect(flushDrawEvents(), "no unexpected draw events").toEqual([])
    })

    it("except when the API function does not directly correspond to the event", async () => {
        const line = {
            type: "Feature",
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: [
                    [10, 10],
                    [20, 20],
                    [30, 30],
                ],
            },
        }
        const lineId = Draw.add(line)[0]
        Draw.changeMode("simple_select", {
            featureIds: [lineId],
        })
        await afterNextRender()
        Draw.trash()
        await afterNextRender()
        firedWith("draw.delete", {
            features: [line],
        })
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.delete"])
    })

    it("start draw_point mode then exit with Enter", async () => {
        Draw.deleteAll()
        Draw.changeMode("draw_point")
        container.dispatchEvent(enterEvent())
        await afterNextRender()
        firedWith("draw.modechange", {
            mode: "simple_select",
        })
        expect(Draw.getAll().features.length, "no feature created").toBe(0)
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.modechange"])
    })

    it("start draw_point mode then exit with Escape", async () => {
        Draw.deleteAll()
        Draw.changeMode("draw_point")
        container.dispatchEvent(escapeEvent())
        await afterNextRender()
        firedWith("draw.modechange", {
            mode: "simple_select",
        })
        expect(Draw.getAll().features.length, "no feature created").toBe(0)
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.modechange"])
    })

    it("start draw_line_string mode and drawing a line then finish with Enter", async () => {
        Draw.deleteAll()
        Draw.changeMode("draw_line_string")
        click(map, makeMouseEvent(240, 240))
        click(map, makeMouseEvent(260, 260))
        container.dispatchEvent(enterEvent())
        await afterNextRender()
        const expectedLine = {
            type: "Feature",
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: [
                    [240, 240],
                    [260, 260],
                ],
            },
        }
        firedWith("draw.create", {
            features: [expectedLine],
        })

        firedWith("draw.selectionchange", {
            features: [expectedLine],
            points: [],
        })

        firedWith("draw.modechange", {
            mode: "simple_select",
        })

        expect(flushDrawEvents(), "no unexpected draw events").toEqual([
            "draw.create",
            "draw.modechange",
            "draw.selectionchange",
        ])
    })

    it("start draw_line_string mode then exit with Escape", async () => {
        Draw.deleteAll()
        Draw.changeMode("draw_line_string")
        click(map, makeMouseEvent(0, 0))
        click(map, makeMouseEvent(20, 20))
        container.dispatchEvent(escapeEvent())
        await afterNextRender()
        firedWith("draw.modechange", {
            mode: "simple_select",
        })
        expect(Draw.getAll().features.length, "no feature created").toBe(0)
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.modechange"])
    })

    it("start draw_polygon mode and drawing a polygon then finish with Enter", async () => {
        Draw.deleteAll()
        Draw.changeMode("draw_polygon")
        click(map, makeMouseEvent(240, 240))
        click(map, makeMouseEvent(260, 260))
        click(map, makeMouseEvent(300, 200))
        container.dispatchEvent(enterEvent())
        await afterNextRender()
        const expectedPolygon = {
            type: "Feature",
            properties: {},
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [240, 240],
                        [260, 260],
                        [300, 200],
                        [240, 240],
                    ],
                ],
            },
        }
        firedWith("draw.create", {
            features: [expectedPolygon],
        })

        firedWith("draw.selectionchange", {
            features: [expectedPolygon],
            points: [],
        })

        firedWith("draw.modechange", {
            mode: "simple_select",
        })

        expect(flushDrawEvents(), "no unexpected draw events").toEqual([
            "draw.create",
            "draw.modechange",
            "draw.selectionchange",
        ])
    })

    it("start draw_polygon mode then exit with Escape", async () => {
        Draw.deleteAll()
        Draw.changeMode("draw_polygon")
        click(map, makeMouseEvent(0, 0))
        click(map, makeMouseEvent(20, 20))
        click(map, makeMouseEvent(30, 30))
        container.dispatchEvent(escapeEvent())
        await afterNextRender()
        firedWith("draw.modechange", {
            mode: "simple_select",
        })
        expect(Draw.getAll().features.length, "no feature created").toBe(0)
        expect(flushDrawEvents(), "no unexpected draw events").toEqual(["draw.modechange"])
    })

    it("box selection includes no features", async () => {
        Draw.deleteAll()
        Draw.changeMode("simple_select")
        click(map, makeMouseEvent(0, 0, { shiftKey: true }))
        click(map, makeMouseEvent(100, 100, { shiftKey: true }))
        await afterNextRender()
        expect(flushDrawEvents(), "no unexpected draw events").toEqual([])
    })
})
