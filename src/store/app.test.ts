import { describe, test, expect } from "vitest"
import reducer, { appSlice, selectShowAttribution, selectShowLeftSidebar, selectShowRightSidebar, selectVersion } from "./app"

const { setVersion, toggleZenMode, toggleDarkTheme, setDarkTheme, showLeftSidebar, hideLeftSidebar, showRightSidebar, hideRightSidebar } = appSlice.actions
const { isZen, isDark } = appSlice.selectors

const makeRootState = (app: object) => ({ app } as any)

describe("appSlice reducer", () => {
    test("initial state", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.version).toBe("")
        expect(state.zenMode).toBe(false)
        expect(state.darkTheme).toBe(false)
        expect(state.showLeftSidebar).toBe(true)
        expect(state.showRightSidebar).toBe(true)
    })

    test("setVersion updates version", () => {
        const state = reducer(undefined, setVersion("1.2.3"))
        expect(state.version).toBe("1.2.3")
    })

    test("toggleZenMode toggles from false to true", () => {
        const state = reducer(undefined, toggleZenMode())
        expect(state.zenMode).toBe(true)
    })

    test("toggleZenMode toggles from true to false", () => {
        const prev = { version: "", zenMode: true, darkTheme: false, showAttribution: false, showLeftSidebar: true, showRightSidebar: true }
        const state = reducer(prev, toggleZenMode())
        expect(state.zenMode).toBe(false)
    })

    test("toggleDarkTheme toggles from false to true", () => {
        const state = reducer(undefined, toggleDarkTheme())
        expect(state.darkTheme).toBe(true)
    })

    test("toggleDarkTheme toggles from true to false", () => {
        const prev = { version: "", zenMode: false, darkTheme: true, showAttribution: false, showLeftSidebar: true, showRightSidebar: true }
        const state = reducer(prev, toggleDarkTheme())
        expect(state.darkTheme).toBe(false)
    })

    test("setDarkTheme sets darkTheme to true", () => {
        const state = reducer(undefined, setDarkTheme(true))
        expect(state.darkTheme).toBe(true)
    })

    test("setDarkTheme sets darkTheme to false", () => {
        const prev = { version: "", zenMode: false, darkTheme: true, showAttribution: false, showLeftSidebar: true, showRightSidebar: true }
        const state = reducer(prev, setDarkTheme(false))
        expect(state.darkTheme).toBe(false)
    })

    test("showLeftSidebar sets showLeftSidebar to true", () => {
        const prev = { version: "", zenMode: false, darkTheme: false, showAttribution: false, showLeftSidebar: false, showRightSidebar: true }
        const state = reducer(prev, showLeftSidebar())
        expect(state.showLeftSidebar).toBe(true)
    })

    test("hideLeftSidebar sets showLeftSidebar to false", () => {
        const state = reducer(undefined, hideLeftSidebar())
        expect(state.showLeftSidebar).toBe(false)
    })

    test("showRightSidebar sets showRightSidebar to true", () => {
        const prev = { version: "", zenMode: false, darkTheme: false, showAttribution: false, showLeftSidebar: true, showRightSidebar: false }
        const state = reducer(prev, showRightSidebar())
        expect(state.showRightSidebar).toBe(true)
    })

    test("hideRightSidebar sets showRightSidebar to false", () => {
        const state = reducer(undefined, hideRightSidebar())
        expect(state.showRightSidebar).toBe(false)
    })
})

describe("appSlice selectors", () => {
    test("isZen returns false when zenMode is false", () => {
        expect(isZen(makeRootState({ zenMode: false }))).toBe(false)
    })

    test("isZen returns true when zenMode is true", () => {
        expect(isZen(makeRootState({ zenMode: true }))).toBe(true)
    })

    test("isDark returns false when darkTheme is false", () => {
        expect(isDark(makeRootState({ darkTheme: false }))).toBe(false)
    })

    test("isDark returns true when darkTheme is true", () => {
        expect(isDark(makeRootState({ darkTheme: true }))).toBe(true)
    })
})

describe("app RootState selectors", () => {
    test("selectVersion returns version", () => {
        expect(selectVersion(makeRootState({ version: "2.0.0" }))).toBe("2.0.0")
    })

    test("selectShowAttribution returns showAttribution", () => {
        expect(selectShowAttribution(makeRootState({ showAttribution: true }))).toBe(true)
        expect(selectShowAttribution(makeRootState({ showAttribution: false }))).toBe(false)
    })

    test("selectShowLeftSidebar returns true when showLeftSidebar is true and zenMode is false", () => {
        expect(selectShowLeftSidebar(makeRootState({ showLeftSidebar: true, zenMode: false }))).toBe(true)
    })

    test("selectShowLeftSidebar returns false when zenMode is true", () => {
        expect(selectShowLeftSidebar(makeRootState({ showLeftSidebar: true, zenMode: true }))).toBe(false)
    })

    test("selectShowLeftSidebar returns false when showLeftSidebar is false", () => {
        expect(selectShowLeftSidebar(makeRootState({ showLeftSidebar: false, zenMode: false }))).toBe(false)
    })

    test("selectShowRightSidebar returns showRightSidebar", () => {
        expect(selectShowRightSidebar(makeRootState({ showRightSidebar: true }))).toBe(true)
        expect(selectShowRightSidebar(makeRootState({ showRightSidebar: false }))).toBe(false)
    })
})
