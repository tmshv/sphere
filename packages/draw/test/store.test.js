import { beforeAll, describe, expect, it } from "vitest"
import Store from "../src/store"
import createFeature from "./utils/create_feature"
import getPublicMemberKeys from "./utils/get_public_member_keys"
import createMap from "./utils/create_map"

function createStore() {
    const map = createMap()
    const ctx = { map }
    return new Store(ctx)
}

it("Store has correct properties", () => {
    expect(Store, "store exists").toBeTruthy()
    expect(typeof Store === "function", "store is a function").toBeTruthy()
})

it("Store constructor and public API", () => {
    const map = createMap()
    const ctx = { map }
    const store = new Store(ctx)

    // instance members
    expect(store.sources, "exposes store.sources").toEqual({
        hot: [],
        cold: [],
    })
    expect(store.ctx, "exposes store.ctx").toBe(ctx)
    expect(store.ctx.map, "exposes store.ctx.map").toBe(map)
    expect(store.isDirty, "exposes store.isDirty").toBe(false)
    expect(typeof store.render, "exposes store.render").toBe("function")

    expect(getPublicMemberKeys(store).length, "no unexpected instance members").toBe(4)

    // prototype members
    expect(typeof Store.prototype.setDirty, "exposes store.setDirty").toBe("function")
    expect(typeof Store.prototype.createRenderBatch, "exposes store.createRenderBatch").toBe("function")
    expect(typeof Store.prototype.featureChanged, "exposes store.featureChanged").toBe("function")
    expect(typeof Store.prototype.getChangedIds, "exposes store.getChangedIds").toBe("function")
    expect(typeof Store.prototype.clearChangedIds, "exposes store.clearChangedIds").toBe("function")
    expect(typeof Store.prototype.getAllIds, "exposes store.getAllIds").toBe("function")
    expect(typeof Store.prototype.add, "exposes store.add").toBe("function")
    expect(typeof Store.prototype.get, "exposes store.get").toBe("function")
    expect(typeof Store.prototype.getAll, "exposes store.getAll").toBe("function")
    expect(typeof Store.prototype.select, "exposes store.select").toBe("function")
    expect(typeof Store.prototype.deselect, "exposes store.deselect").toBe("function")
    expect(typeof Store.prototype.clearSelected, "exposes store.clearSelected").toBe("function")
    expect(typeof Store.prototype.getSelectedIds, "exposes store.getSelectedIds").toBe("function")
    expect(typeof Store.prototype.getSelected, "exposes store.getSelected").toBe("function")
    expect(typeof Store.prototype.isSelected, "exposes store.isSelected").toBe("function")
    expect(typeof Store.prototype.delete, "exposes store.delete").toBe("function")
    expect(typeof Store.prototype.setSelected, "exposes store.setSelected").toBe("function")
    expect(typeof Store.prototype.setSelectedCoordinates, "exposes store.setSelectedCoordinates").toBe("function")
    expect(typeof Store.prototype.getSelectedCoordinates, "exposes store.getSelectedCoordinates").toBe("function")
    expect(typeof Store.prototype.clearSelectedCoordinates, "exposes store.clearSelectedCoordinates").toBe("function")
    expect(typeof Store.prototype.setFeatureProperty, "exposes store.setFeatureProperty").toBe("function")
    expect(typeof Store.prototype.storeMapConfig, "exposes store.storeMapConfig").toBe("function")
    expect(typeof Store.prototype.restoreMapConfig, "exposes store.restoreMapConfig").toBe("function")
    expect(typeof Store.prototype.getInitialConfigValue, "exposes store.getInitialConfigValue").toBe("function")

    expect(getPublicMemberKeys(Store.prototype).length, "no untested prototype members").toBe(24)
})

it("Store#setDirty", () => {
    const store = createStore()
    expect(store.isDirty).toBe(false)
    store.setDirty()
    expect(store.isDirty).toBe(true)
})

it("Store#createRenderBatch", () => {
    const store = createStore()
    let numRenders = 0
    store.render = function () {
        numRenders++
    }
    store.render()
    expect(numRenders, "render incrementes number of renders").toBe(1)
    let renderBatch = store.createRenderBatch()
    store.render()
    store.render()
    store.render()
    expect(numRenders, "when batching render doesn't get incremented").toBe(1)
    renderBatch()
    expect(numRenders, "when releasing batch, render only happens once").toBe(2)

    renderBatch = store.createRenderBatch()
    renderBatch()
    expect(numRenders, "when releasing batch, render doesn't happen if render wasn't called").toBe(2)
})

it("Store#featureChanged, Store#getChangedIds, Store#clearChangedIds", () => {
    const store = createStore()
    expect(store.getChangedIds()).toEqual([])
    store.featureChanged("x")
    expect(store.getChangedIds()).toEqual(["x"])
    store.featureChanged("y")
    expect(store.getChangedIds()).toEqual(["x", "y"])
    store.featureChanged("x")
    expect(store.getChangedIds(), "ids do not duplicate").toEqual(["x", "y"])
    store.clearChangedIds()
    expect(store.getChangedIds()).toEqual([])
})

it("Store#add, Store#get, Store#getAll", () => {
    const store = createStore()
    expect(store.get(1)).toBe(undefined)
    expect(store.getAll()).toEqual([])
    const point = createFeature("point")
    const line = createFeature("line")
    store.add(point)
    expect(store.get(point.id)).toBe(point)
    expect(store.getAll()).toEqual([point])
    store.add(line)
    expect(store.get(point.id)).toBe(point)
    expect(store.get(line.id)).toBe(line)
    expect(store.getAll()).toEqual([point, line])
    store.add(point)
    expect(store.get(point.id)).toBe(point)
    expect(store.get(line.id)).toBe(line)
    expect(store.getAll()).toEqual([point, line])
})

describe("selection methods", () => {
    let store
    let f1
    let f2
    let f3
    let f4

    beforeAll(() => {
        store = createStore()
        f1 = createFeature("point")
        store.add(f1)
        f2 = createFeature("point")
        store.add(f2)
        f3 = createFeature("point")
        store.add(f3)
        f4 = createFeature("point")
        store.add(f4)
    })

    it("no features selected initially", () => {
        expect(store.getSelectedIds()).toEqual([])
    })

    it("select one feature", () => {
        store.select(f1.id)
        expect(store.getSelectedIds(), "f1 returns in selected ids array").toEqual([f1.id])
        expect(store.getSelected(), "f1 returns in selected array").toEqual([f1.toGeoJSON()])
        expect(store.isSelected(f1.id), "isSelected affirms f1").toBe(true)
        expect(store.isSelected(f2.id), "isSelected rejects f2").toBe(false)
    })

    it("select a second feature", () => {
        store.select(f2.id)
        expect(store.getSelectedIds(), "f1 and f2 return in selected ids array").toEqual([f1.id, f2.id])
        expect(store.getSelected(), "f1 and f2 return in selected array").toEqual([f1, f2])
        expect(store.isSelected(f1.id), "isSelected affirms f1").toBe(true)
        expect(store.isSelected(f2.id), "isSelected affirms f2").toBe(true)
    })

    it("try to re-select first feature", () => {
        store.select(f1.id)
    })

    it("deselect a feature", () => {
        store.deselect(f1.id)
        expect(store.getSelectedIds(), "deselection of f1 clears it from selected array").toEqual([f2.id])
    })

    it("serially select more features", () => {
        store.select(f3.id)
        store.select(f4.id)
        expect(store.getSelectedIds(), "serial selection of f3 and f4 reflected in selected array").toEqual([
            f2.id,
            f3.id,
            f4.id,
        ])
    })

    it("clear selection", () => {
        store.clearSelected()
        expect(store.getSelectedIds()).toEqual([])
    })

    it("select an array of features", () => {
        store.select([f1.id, f3.id, f4.id])
        expect(store.getSelectedIds()).toEqual([f1.id, f3.id, f4.id])
    })

    it("deselect an array of features", () => {
        store.deselect([f1.id, f4.id])
        expect(store.getSelectedIds()).toEqual([f3.id])
    })
})

it("Store#delete", () => {
    const store = createStore()
    const point = createFeature("point")
    const line = createFeature("line")
    const polygon = createFeature("polygon")

    store.add(point)
    store.add(line)
    store.add(polygon)
    expect(store.getAll()).toEqual([point, line, polygon])
    expect(store.getAllIds()).toEqual([point.id, line.id, polygon.id])

    expect(store.getSelectedIds()).toEqual([])
    store.select(line.id)
    expect(store.getSelectedIds()).toEqual([line.id])

    store.delete(line.id)
    expect(store.getAll()).toEqual([point, polygon])
    expect(store.getAllIds()).toEqual([point.id, polygon.id])
    expect(store.getSelectedIds()).toEqual([])
    expect(store.isDirty, "after deletion store is dirty").toBe(true)
})

it("Store#setSelected", () => {
    const store = createStore()
    const point = createFeature("point")
    const line = createFeature("line")
    const polygon = createFeature("polygon")

    store.setSelected(point.id)
    expect(store.getSelectedIds()).toEqual([point.id])

    store.setSelected([line.id, polygon.id])
    expect(store.getSelectedIds()).toEqual([line.id, polygon.id])

    store.setSelected(line.id)
    expect(store.getSelectedIds()).toEqual([line.id])

    store.setSelected()
    expect(store.getSelectedIds()).toEqual([])
})

it("Store#setFeatureProperty", () => {
    const store = createStore()
    const point = createFeature("point")

    store.add(point)
    store.clearChangedIds()
    store.setFeatureProperty(point.id, "size", 200)
    expect(store.getChangedIds()).toEqual([point.id])
    expect(store.get(point.id).properties.size, "sets the property on the feature").toBe(200)
})

it("Store#storeAndRestoreMapConfig", () => {
    const map = createMap()
    // Disable doubleClickZoom
    map.doubleClickZoom.disable()
    // Check it's disabled
    expect(map.doubleClickZoom.isEnabled(), "Disables doubleClickZoom on the map").toBe(false)
    const ctx = { map }
    const store = new Store(ctx)
    store.storeMapConfig()
    // Check we can get the initial state of it
    expect(store.getInitialConfigValue("doubleClickZoom"), "Retrieves the initial value for the doubleClickZoom").toBe(
        false,
    )
    // Enable it again, byt then use restore to reset the initial state
    map.doubleClickZoom.enable()
    store.restoreMapConfig()
    expect(map.doubleClickZoom.isEnabled(), "Restores doubleClickZoom on the map").toBe(false)
})
