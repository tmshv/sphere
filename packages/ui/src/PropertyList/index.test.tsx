import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    act,
    declaredStyle,
    expectDesktopInteraction,
    fireEvent,
    render,
    screen,
    stateStyle,
    within,
} from "../test-utils"
import {
    COPIED_LABEL,
    COPY_FAILED_LABEL,
    COPY_LABEL,
    COPY_NAME_LABEL,
    COPY_PAIR_LABEL,
    COPY_VALUE_LABEL,
    PropertyList,
    pairText,
} from "."
import { COPY_FEEDBACK_MS } from "./useCopy"

const ITEMS = [
    { name: "name", value: "Berlin" },
    { name: "population", value: 3600000 },
]
const IMAGE_URL = "https://example.com/photo.jpg"

function mockClipboard(writeText: () => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn(writeText) },
        writable: true,
        configurable: true,
    })
}

function rowOf(name: string): HTMLElement {
    const row = screen.getByText(name).parentElement
    if (!row) {
        throw new Error(`row ${name} not found`)
    }
    return row
}

async function run(fn: () => void) {
    await act(async () => {
        fn()
    })
}

beforeEach(() => {
    vi.useFakeTimers()
    mockClipboard(() => Promise.resolve())
})

afterEach(() => {
    vi.useRealTimers()
})

describe("PropertyList", () => {
    it("pairs each name with its value as a description list", () => {
        const { container } = render(<PropertyList items={ITEMS} />)

        expect(Array.from(container.querySelectorAll("dt"), dt => dt.textContent)).toEqual(["name", "population"])
        expect(Array.from(container.querySelectorAll("dd"), dd => dd.textContent)).toEqual(["Berlin", "3600000"])
    })

    it("lines every value up on one column, with the name column as wide as the longest name up to a cap", () => {
        const { container } = render(<PropertyList items={ITEMS} />)
        const list = container.querySelector("dl")
        if (!list) {
            throw new Error("list not found")
        }

        expect(declaredStyle(list, "display")).toBe("grid")
        expect(declaredStyle(list, "grid-template-columns")).toBe(
            "fit-content(var(--property-name-max-width)) minmax(0, 1fr)",
        )
        expect(declaredStyle(rowOf("name"), "grid-template-columns")).toBe("subgrid")
        expect(declaredStyle(rowOf("name"), "grid-column")).toBe("1 / -1")
    })

    it("sets names left-aligned in the secondary colour and lets long names and values wrap", () => {
        render(<PropertyList items={ITEMS} />)
        const name = screen.getByText("name")
        const value = screen.getByText("Berlin")

        expect(declaredStyle(name, "color")).toBe("var(--sphere-color-label-secondary)")
        expect(declaredStyle(name, "text-align")).toBe("")
        expect(declaredStyle(name, "overflow-wrap")).toBe("anywhere")
        expect(declaredStyle(value, "overflow-wrap")).toBe("anywhere")
    })

    it("has a copy glyph on every row, with the desktop interaction model on the button itself", () => {
        render(<PropertyList items={ITEMS} />)
        const glyphs = screen.getAllByRole("button", { name: COPY_LABEL })

        expect(glyphs).toHaveLength(ITEMS.length)
        for (const glyph of glyphs) {
            expectDesktopInteraction(glyph)
        }
    })

    it("hides the glyph at rest and reveals it on row hover and keyboard focus", () => {
        render(<PropertyList items={ITEMS} />)
        const reveal = within(rowOf("name")).getByRole("button").parentElement
        if (!reveal) {
            throw new Error("glyph wrapper not found")
        }

        expect(declaredStyle(reveal, "opacity")).toBe("0")
        expect(stateStyle(reveal, "opacity", ":hover")).toBe("1")
        expect(stateStyle(reveal, "opacity", ":focus-within")).toBe("1")
    })

    it("keeps the glyph of the row just copied shown while the result shows", async () => {
        render(<PropertyList items={ITEMS} />)

        await run(() => fireEvent.click(within(rowOf("name")).getByRole("button")))

        const copied = within(rowOf("name")).getByRole("button").parentElement
        const other = within(rowOf("population")).getByRole("button").parentElement
        expect(copied).toHaveAttribute("data-shown")
        expect(other).not.toHaveAttribute("data-shown")
        if (copied) {
            expect(declaredStyle(copied, "opacity")).toBe("1")
        }
    })

    it("copies a row's value from its glyph and confirms on that row only, then goes back", async () => {
        render(<PropertyList items={ITEMS} />)

        await run(() => fireEvent.click(within(rowOf("population")).getByRole("button")))

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("3600000")
        expect(within(rowOf("population")).getByRole("button", { name: COPIED_LABEL })).toBeInTheDocument()
        expect(within(rowOf("name")).getByRole("button", { name: COPY_LABEL })).toBeInTheDocument()

        await run(() => vi.advanceTimersByTime(COPY_FEEDBACK_MS))
        expect(within(rowOf("population")).getByRole("button", { name: COPY_LABEL })).toBeInTheDocument()
    })

    it("says so when the clipboard refuses", async () => {
        mockClipboard(() => Promise.reject(new Error("denied")))
        render(<PropertyList items={ITEMS} />)

        await run(() => fireEvent.click(within(rowOf("name")).getByRole("button")))

        expect(within(rowOf("name")).getByRole("button", { name: COPY_FAILED_LABEL })).toBeInTheDocument()
    })

    it.each([
        [COPY_VALUE_LABEL, "Berlin"],
        [COPY_NAME_LABEL, "name"],
        [COPY_PAIR_LABEL, "name: Berlin"],
    ])("copies from the right-click menu: %s", async (label, text) => {
        render(<PropertyList items={ITEMS} />)

        await run(() => fireEvent.contextMenu(screen.getByText("Berlin")))
        await run(() => fireEvent.click(screen.getByRole("menuitem", { name: label })))

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text)
        expect(within(rowOf("name")).getByRole("button", { name: COPIED_LABEL })).toBeInTheDocument()
        expect(screen.queryByRole("menuitem", { name: label })).not.toBeInTheDocument()
    })

    it("opens the menu from the name too", async () => {
        render(<PropertyList items={ITEMS} />)

        await run(() => fireEvent.contextMenu(screen.getByText("population")))

        expect(screen.getByRole("menuitem", { name: COPY_VALUE_LABEL })).toBeInTheDocument()
    })

    it("has no glyph and no menu when not copyable", async () => {
        render(<PropertyList items={ITEMS} copyable={false} />)

        await run(() => fireEvent.contextMenu(screen.getByText("Berlin")))

        expect(screen.queryByRole("button")).not.toBeInTheDocument()
        expect(screen.queryByRole("menuitem")).not.toBeInTheDocument()
    })

    it("shows a URL value as its image when asked, and copies the URL", async () => {
        render(<PropertyList items={[{ name: "photo", value: IMAGE_URL }]} checkUrls />)

        expect(screen.getByRole("img", { name: "photo" })).toHaveAttribute("src", IMAGE_URL)
        await run(() => fireEvent.click(screen.getByRole("button", { name: COPY_LABEL })))
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(IMAGE_URL)
    })

    it("shows a URL as text unless asked for images", () => {
        render(<PropertyList items={[{ name: "photo", value: IMAGE_URL }]} />)

        expect(screen.getByText(IMAGE_URL)).toBeInTheDocument()
        expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })
})

describe("pairText", () => {
    it("joins the name and the value", () => {
        expect(pairText({ name: "population", value: 3600000 })).toBe("population: 3600000")
    })
})
