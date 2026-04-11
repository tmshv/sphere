import { describe, expect, test } from "vitest"
import reducer, {
    appSlice,
    selectActiveSidebarTab,
    selectShowAttribution,
    selectShowLeftSidebar,
    selectShowRightSidebar,
    selectVersion,
} from "./app"

const {
    setVersion,
    toggleZenMode,
    toggleDarkTheme,
    setDarkTheme,
    showLeftSidebar,
    hideLeftSidebar,
    showRightSidebar,
    hideRightSidebar,
    setActiveSidebarTab,
    setMapTool,
} = appSlice.actions
const { isZen, isDark } = appSlice.selectors

import type { RootState } from "./index"

const makeRootState = (app: object) => ({ app }) as unknown as RootState

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
        const prev = { ...reducer(undefined, { type: "@@INIT" }), zenMode: true }
        const state = reducer(prev, toggleZenMode())
        expect(state.zenMode).toBe(false)
    })

    test("toggleDarkTheme toggles from false to true", () => {
        const state = reducer(undefined, toggleDarkTheme())
        expect(state.darkTheme).toBe(true)
    })

    test("toggleDarkTheme toggles from true to false", () => {
        const prev = { ...reducer(undefined, { type: "@@INIT" }), darkTheme: true }
        const state = reducer(prev, toggleDarkTheme())
        expect(state.darkTheme).toBe(false)
    })

    test("setDarkTheme sets darkTheme to true", () => {
        const state = reducer(undefined, setDarkTheme(true))
        expect(state.darkTheme).toBe(true)
    })

    test("setDarkTheme sets darkTheme to false", () => {
        const prev = { ...reducer(undefined, { type: "@@INIT" }), darkTheme: true }
        const state = reducer(prev, setDarkTheme(false))
        expect(state.darkTheme).toBe(false)
    })

    test("showLeftSidebar sets showLeftSidebar to true", () => {
        const prev = { ...reducer(undefined, { type: "@@INIT" }), showLeftSidebar: false }
        const state = reducer(prev, showLeftSidebar())
        expect(state.showLeftSidebar).toBe(true)
    })

    test("hideLeftSidebar sets showLeftSidebar to false", () => {
        const state = reducer(undefined, hideLeftSidebar())
        expect(state.showLeftSidebar).toBe(false)
    })

    test("showRightSidebar sets showRightSidebar to true", () => {
        const prev = { ...reducer(undefined, { type: "@@INIT" }), showRightSidebar: false }
        const state = reducer(prev, showRightSidebar())
        expect(state.showRightSidebar).toBe(true)
    })

    test("hideRightSidebar sets showRightSidebar to false", () => {
        const state = reducer(undefined, hideRightSidebar())
        expect(state.showRightSidebar).toBe(false)
    })

    test("initial activeSidebarTab is sources", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.activeSidebarTab).toBe("sources")
    })

    test("setActiveSidebarTab sets to layers", () => {
        const state = reducer(undefined, setActiveSidebarTab("layers"))
        expect(state.activeSidebarTab).toBe("layers")
    })

    test("setActiveSidebarTab sets to sources", () => {
        const prev = { ...reducer(undefined, { type: "@@INIT" }), activeSidebarTab: "layers" as const }
        const state = reducer(prev, setActiveSidebarTab("sources"))
        expect(state.activeSidebarTab).toBe("sources")
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

    test("selectActiveSidebarTab returns activeSidebarTab", () => {
        expect(selectActiveSidebarTab(makeRootState({ activeSidebarTab: "layers" }))).toBe("layers")
        expect(selectActiveSidebarTab(makeRootState({ activeSidebarTab: "sources" }))).toBe("sources")
    })
})

describe("app slice mapTool", () => {
    test("default mapTool is navigation", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.mapTool).toBe("navigation")
    })

    test("setMapTool changes to select", () => {
        const state = reducer(undefined, setMapTool("select"))
        expect(state.mapTool).toBe("select")
    })

    test("setMapTool changes to info", () => {
        const state = reducer(undefined, setMapTool("info"))
        expect(state.mapTool).toBe("info")
    })

    test("setMapTool returns to navigation", () => {
        const prev = { ...reducer(undefined, { type: "@@INIT" }), mapTool: "select" as const }
        const state = reducer(prev, setMapTool("navigation"))
        expect(state.mapTool).toBe("navigation")
    })
})
