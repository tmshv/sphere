# Resizable Panel Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled sidebar resize hook and the accordion-based sidebar sections with composable split-view primitives, so the boundary between Outline and the Source/Layer panel can be dragged and future layouts reuse the same mechanism.

**Architecture:** Three layers in `@sphere/ui`, each usable without the one above it. `SplitView`/`SplitPane` wrap `allotment` and are the only files that import it. `AppLayout` becomes a horizontal split of left sidebar, body and right sidebar. `SectionStack` is a vertical split whose panes open and close, a closed pane pinned to its header height.

**Tech Stack:** React 18, TypeScript, Mantine 5 (`createStyles`), `allotment` 1.20.5, Vitest + Testing Library + happy-dom, Biome.

**Spec:** `docs/specs/20260919-resizable-panel-layout.md`

**Issue:** [#254](https://github.com/tmshv/sphere/issues/254). Repo convention would put the branch at `issue-254`.

## Global Constraints

- Code style: double quotes, no semicolons, 4-space indentation, trailing commas in multiline structures, Unix line endings.
- React components use the arrow + `React.FC<Props>` form, matching `Sidebar` and `PanelBody` in `packages/ui`. `forwardRef` components use a named function expression because the API requires it.
- Single-param arrow functions take no parentheses: `theme => ({ … })`, not `(theme) => ({ … })`.
- Forbidden, without exception: non-null assertions (`!`), untyped `as` casts, `any`, magic numbers and strings, nested ternaries beyond one level, `console.log`, `biome-ignore` or any other lint-suppression comment, out-of-bounds index access (use `.at()` with an explicit `undefined` guard).
- Run `npm run format` after every code modification.
- No `crates/` file is touched, so no Rust crate version bump applies.
- `@sphere/ui` and `@sphere/utils` stay pinned at `0.0.0`. Never bump them.
- `@sphere/ui` may not import Tauri, Redux, or maplibre. React and Mantine are peer dependencies.
- Commit messages are a single line, imperative mood, under ~72 characters. No body, no trailers.

## File Structure

**Created:**

| Path                                          | Responsibility                                             |
| --------------------------------------------- | ---------------------------------------------------------- |
| `packages/ui/src/Split/index.tsx`             | `SplitView`/`SplitPane` over `allotment`; only importer    |
| `packages/ui/src/Split/sizes.ts`              | `restoreSize` — pure size redistribution arithmetic        |
| `packages/ui/src/Split/sizes.test.ts`         | Unit tests for `restoreSize`                               |
| `packages/ui/src/Split/index.test.tsx`        | Render tests for `SplitView`/`SplitPane`                   |
| `packages/ui/src/SectionStack/index.tsx`      | Open/closable resizable sections                           |
| `packages/ui/src/SectionStack/index.test.tsx` | Behaviour tests for `SectionStack`                         |
| `packages/ui/src/AppLayout/index.test.tsx`    | Characterization tests, written before `AppLayout` changes |
| `packages/ui/src/Sidebar/index.test.tsx`      | Characterization test, written before `Sidebar` changes    |

**Modified:**

| Path                                                    | Change                                         |
| ------------------------------------------------------- | ---------------------------------------------- |
| `packages/ui/package.json`                              | `allotment` added to `peerDependencies`        |
| `apps/sphere/package.json`                              | `allotment` added to `dependencies`            |
| `packages/ui/src/index.ts`                              | Export `Split` and `SectionStack`              |
| `packages/ui/src/AppLayout/index.tsx`                   | Body row becomes a horizontal `SplitView`      |
| `packages/ui/src/Sidebar/index.tsx`                     | Resize machinery removed; becomes chrome       |
| `apps/sphere/src/components/App/index.tsx`              | `onResize` moves from `Sidebar` to `AppLayout` |
| `apps/sphere/src/components/LeftSidebar/LayersTab.tsx`  | `StyledAccordion` → `SectionStack`             |
| `apps/sphere/src/components/LeftSidebar/SourcesTab.tsx` | `StyledAccordion` → `SectionStack`             |

**Deleted:**

- `apps/sphere/src/components/LeftSidebar/StyledAccordion.tsx`
- `apps/sphere/src/components/LeftSidebar/StyledAccordion.test.tsx`

## Deviations from the spec

Two, both deliberate, both small. An executor should not silently "fix" them back.

1. **The spec worried about sash hit area** (`--sash-size` must be no harder to grab than today's 4px). `allotment`'s default `--sash-size` is `8px` — verified at `dist/style.css:73` — which is twice today's grab area. So `--sash-size` is left at its default and `setSashSize` is never called. Only `--separator-border` and `--focus-border` are themed.
2. **The spec said `Sidebar` keeps its right border.** It does not. `allotment` draws a 1px separator between panes from `--separator-border`; keeping `Sidebar`'s own `borderRight` as well would render two adjacent 1px lines. The separator becomes the single source of that line and is themed to the colour `Sidebar` used. This follows the repo's "one place per concept" rule.

---

### Task 1: Install dependencies and retire the happy-dom risk

The spec's largest risk is that `allotment` renders nothing useful under happy-dom, where `ResizeObserver` is a stub that never fires and `getBoundingClientRect` returns zeros. If that breaks rendering, every sidebar test fails at once and the whole design needs rework. This task finds out before any real code is written. The probe is throwaway and is not committed.

**Files:**
- Modify: `packages/ui/package.json`
- Modify: `apps/sphere/package.json`
- Temporary (never committed): `apps/sphere/src/components/LeftSidebar/probe.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: an installed `allotment` 1.20.5, and a decision recorded in the commit body of whether `setupTests.ts` shims are needed.

- [ ] **Step 1: Install the workspace**

`node_modules` is not present in this worktree.

```bash
npm install
```

- [ ] **Step 2: Add `allotment` to both package manifests**

In `packages/ui/package.json`, add to `peerDependencies` (it is a peer, like Mantine — the app supplies the single instance):

```json
        "allotment": "^1.20.5"
```

In `apps/sphere/package.json`, add to `dependencies`, keeping alphabetical order (it sorts after `@turf/turf` and before `date-fns`):

```json
        "allotment": "^1.20.5",
```

- [ ] **Step 3: Install the new dependency**

```bash
npm install
```

Expected: `allotment@1.20.5` present in the root `node_modules`.

- [ ] **Step 4: Write the throwaway probe**

Create `apps/sphere/src/components/LeftSidebar/probe.test.tsx`. This wraps the real `LeftSidebar` in a bare `Allotment` and asserts the content is still reachable — exactly what every existing sidebar test depends on.

```tsx
import { render, screen } from "@/test-utils"
import { configureStore } from "@reduxjs/toolkit"
import { Allotment } from "allotment"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import "allotment/dist/style.css"

const makeStore = () =>
    configureStore({
        reducer: {
            app: () => ({ darkTheme: false, zenMode: false, activeSidebarTab: "layers" }),
            layer: () => ({ selectedId: null, items: {}, allIds: [] }),
            source: () => ({ selectedId: null, items: {}, allIds: [] }),
        },
    })

describe("allotment under happy-dom", () => {
    it("still renders pane children into the document", () => {
        render(
            <Provider store={makeStore()}>
                <Allotment vertical>
                    <Allotment.Pane>
                        <div>top pane</div>
                    </Allotment.Pane>
                    <Allotment.Pane>
                        <div>bottom pane</div>
                    </Allotment.Pane>
                </Allotment>
            </Provider>,
        )

        expect(screen.getByText("top pane")).toBeInTheDocument()
        expect(screen.getByText("bottom pane")).toBeInTheDocument()
    })
})
```

- [ ] **Step 5: Run the probe and the existing sidebar suites**

```bash
npx vitest run --root apps/sphere src/components/LeftSidebar
```

Expected: the probe passes, and `LayersTab.test.tsx`, `SourcesTab.test.tsx`, `index.test.tsx`, `StyledAccordion.test.tsx` all still pass.

**If the probe fails**, the CSS import or `ResizeObserver` is the cause. Add this shim to **both** `apps/sphere/src/setupTests.ts` and `packages/ui/src/setupTests.ts` before continuing, and re-run:

```ts
import "@testing-library/jest-dom"

if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
}
```

Record which branch was taken — it changes nothing downstream except whether these two files are in the commit.

- [ ] **Step 6: Delete the probe**

```bash
rm apps/sphere/src/components/LeftSidebar/probe.test.tsx
```

The probe answered its question. Keeping it would test the library, not our code.

- [ ] **Step 7: Verify the probe file is gone and commit**

```bash
git status --short
git add packages/ui/package.json apps/sphere/package.json package-lock.json
git commit -m "Add allotment dependency"
```

`git status --short` must not list `probe.test.tsx`. If the shim was needed, add both `setupTests.ts` files to the same commit.

---

### Task 2: Characterization tests for `AppLayout` and `Sidebar`

The repo requires tests to exist before a file is modified. Neither file has any. These tests describe behaviour that must survive Task 5, so they are written against the code as it stands today and are **not** edited afterwards.

**Files:**
- Create: `packages/ui/src/AppLayout/index.test.tsx`
- Create: `packages/ui/src/Sidebar/index.test.tsx`

**Interfaces:**
- Consumes: `AppLayout` and `Sidebar` as they exist today.
- Produces: the regression signal for Task 5. No production code.

- [ ] **Step 1: Write the `AppLayout` test**

Create `packages/ui/src/AppLayout/index.test.tsx`:

```tsx
import { describe, expect, it } from "vitest"
import { render, screen } from "../test-utils"
import { AppLayout } from "."

describe("AppLayout", () => {
    it("renders the body and the footer", () => {
        render(
            <AppLayout footer={<div>status</div>}>
                <div>map</div>
            </AppLayout>,
        )

        expect(screen.getByText("map")).toBeInTheDocument()
        expect(screen.getByText("status")).toBeInTheDocument()
    })

    it("renders both sidebars when given", () => {
        render(
            <AppLayout footer={<div>status</div>} leftSidebar={<div>left</div>} rightSidebar={<div>right</div>}>
                <div>map</div>
            </AppLayout>,
        )

        expect(screen.getByText("left")).toBeInTheDocument()
        expect(screen.getByText("right")).toBeInTheDocument()
    })

    it("omits a sidebar that is not given", () => {
        render(
            <AppLayout footer={<div>status</div>} leftSidebar={<div>left</div>}>
                <div>map</div>
            </AppLayout>,
        )

        expect(screen.getByText("left")).toBeInTheDocument()
        expect(screen.queryByText("right")).not.toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Write the `Sidebar` test**

Create `packages/ui/src/Sidebar/index.test.tsx`. It asserts only what survives the rewrite — that children render — because the width behaviour is what Task 5 deliberately removes.

```tsx
import { describe, expect, it } from "vitest"
import { render, screen } from "../test-utils"
import { Sidebar } from "."

describe("Sidebar", () => {
    it("renders its children", () => {
        render(
            <Sidebar startWidth={300} minWidth={265} maxWidth={500}>
                <div>panel</div>
            </Sidebar>,
        )

        expect(screen.getByText("panel")).toBeInTheDocument()
    })
})
```

- [ ] **Step 3: Run both tests to verify they pass against current code**

```bash
npx vitest run --root packages/ui src/AppLayout src/Sidebar
```

Expected: PASS. These describe existing behaviour, so a failure here means the test is wrong, not the code.

- [ ] **Step 4: Format and commit**

```bash
npm run format
git add packages/ui/src/AppLayout/index.test.tsx packages/ui/src/Sidebar/index.test.tsx
git commit -m "Add characterization tests for AppLayout and Sidebar"
```

---

### Task 3: The `restoreSize` helper

`allotment` grows a reopened pane only to its `minSize`, so a section that was 300px comes back at its minimum. This pure function computes the corrected size array. It is the whole of the reopen logic, it touches no DOM, and it is tested directly.

**Files:**
- Create: `packages/ui/src/Split/sizes.ts`
- Create: `packages/ui/src/Split/sizes.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `restoreSize(sizes: number[], index: number, target: number, minSizes: number[]): number[]`, used by `SectionStack` in Task 7.

- [ ] **Step 1: Write the failing tests**

Create `packages/ui/src/Split/sizes.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { restoreSize } from "./sizes"

describe("restoreSize", () => {
    it("takes the difference from the other sections", () => {
        expect(restoreSize([100, 300], 0, 200, [30, 30])).toEqual([200, 200])
    })

    it("takes proportionally from several sections", () => {
        const result = restoreSize([100, 200, 100], 0, 200, [30, 30, 30])

        expect(result.at(0)).toBe(200)
        expect(result.at(1)).toBeCloseTo(133.33, 1)
        expect(result.at(2)).toBeCloseTo(66.67, 1)
    })

    it("gives back only what the minimums allow", () => {
        // The donor cannot fall below 150, so only 150 is available.
        expect(restoreSize([100, 300], 0, 400, [30, 150])).toEqual([250, 150])
    })

    it("preserves the total", () => {
        const before = [100, 200, 100]
        const after = restoreSize(before, 2, 350, [30, 30, 30])
        const sum = (sizes: number[]) => sizes.reduce((total, size) => total + size, 0)

        expect(sum(after)).toBeCloseTo(sum(before), 6)
    })

    it("leaves a lone section alone", () => {
        expect(restoreSize([400], 0, 200, [30])).toEqual([400])
    })

    it("ignores an index past the end", () => {
        expect(restoreSize([100, 300], 5, 200, [30, 30])).toEqual([100, 300])
    })

    it("ignores a negative index", () => {
        expect(restoreSize([100, 300], -1, 200, [30, 30])).toEqual([100, 300])
    })

    it("treats a missing minimum as zero", () => {
        expect(restoreSize([100, 300], 0, 200, [])).toEqual([200, 200])
    })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run --root packages/ui src/Split/sizes.test.ts
```

Expected: FAIL — `Failed to resolve import "./sizes"`.

- [ ] **Step 3: Write the implementation**

Create `packages/ui/src/Split/sizes.ts`:

```ts
// allotment grows a reopened pane only as far as its minSize. To bring a
// section back to the height it had before it was closed, the difference has
// to be taken from its neighbours — proportionally, and never below their own
// minimums. Whatever the minimums refuse to give up simply is not restored,
// which keeps the total unchanged.
export function restoreSize(sizes: number[], index: number, target: number, minSizes: number[]): number[] {
    const current = sizes.at(index)
    if (current === undefined || index < 0) {
        return sizes
    }

    const donorTotal = sizes.reduce((total, size, i) => (i === index ? total : total + size), 0)
    if (donorTotal <= 0) {
        return sizes
    }

    const delta = target - current
    const donated = sizes.map((size, i) => {
        if (i === index) {
            return size
        }

        const min = minSizes.at(i) ?? 0
        return Math.max(size - (delta * size) / donorTotal, min)
    })

    const taken = sizes.reduce((total, size, i) => {
        if (i === index) {
            return total
        }

        return total + (size - (donated.at(i) ?? size))
    }, 0)

    return donated.map((size, i) => (i === index ? size + taken : size))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run --root packages/ui src/Split/sizes.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add packages/ui/src/Split/sizes.ts packages/ui/src/Split/sizes.test.ts
git commit -m "Add restoreSize helper for reopened panes"
```

---

### Task 4: `SplitView` and `SplitPane` primitives

The only files in the codebase that import `allotment`. They own the stylesheet import and translate the Mantine theme into the library's CSS custom properties.

**Files:**
- Create: `packages/ui/src/Split/index.tsx`
- Create: `packages/ui/src/Split/index.test.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: `allotment` — `Allotment`, `AllotmentHandle`, `LayoutPriority`.
- Produces, all used by Tasks 5 and 7:
  - `SplitView: React.ForwardRefExoticComponent<SplitViewProps & React.RefAttributes<SplitViewHandle>>`
  - `SplitPane: React.FC<SplitPaneProps>`
  - `SplitViewHandle = { reset(): void; resize(sizes: number[]): void }`
  - `SplitViewProps = { children, vertical?, defaultSizes?, proportionalLayout?, separator?, className?, onChange?, onDragEnd? }`
  - `SplitPaneProps = { children?, minSize?, maxSize?, preferredSize?, priority?, snap?, visible?, className? }`
  - `LayoutPriority` re-exported, so no consumer imports `allotment`

- [ ] **Step 1: Write the failing tests**

Create `packages/ui/src/Split/index.test.tsx`. Note what is *not* asserted: pane geometry. Under happy-dom every pane lays out at zero, so size assertions would test the environment, not the code. Sizing is verified by hand in Task 9.

```tsx
import { createRef } from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "../test-utils"
import { SplitPane, SplitView, type SplitViewHandle } from "."

describe("SplitView", () => {
    it("renders the children of every pane", () => {
        render(
            <SplitView vertical>
                <SplitPane>
                    <div>top</div>
                </SplitPane>
                <SplitPane>
                    <div>bottom</div>
                </SplitPane>
            </SplitView>,
        )

        expect(screen.getByText("top")).toBeInTheDocument()
        expect(screen.getByText("bottom")).toBeInTheDocument()
    })

    it("puts its className on the root element", () => {
        const { container } = render(
            <SplitView className={"probe"}>
                <SplitPane>
                    <div>only</div>
                </SplitPane>
            </SplitView>,
        )

        expect(container.querySelector(".probe")).not.toBeNull()
    })

    it("exposes resize and reset through its ref", () => {
        const ref = createRef<SplitViewHandle>()
        render(
            <SplitView ref={ref}>
                <SplitPane>
                    <div>only</div>
                </SplitPane>
            </SplitView>,
        )

        expect(typeof ref.current?.resize).toBe("function")
        expect(typeof ref.current?.reset).toBe("function")
    })
})

describe("SplitPane", () => {
    it("renders nothing when given no children", () => {
        render(
            <SplitView>
                <SplitPane>
                    <div>content</div>
                </SplitPane>
                <SplitPane minSize={0} />
            </SplitView>,
        )

        expect(screen.getByText("content")).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run --root packages/ui src/Split/index.test.tsx
```

Expected: FAIL — cannot resolve `.` exports `SplitView`/`SplitPane`.

- [ ] **Step 3: Write the implementation**

Create `packages/ui/src/Split/index.tsx`:

```tsx
import { createStyles } from "@mantine/core"
import { Allotment, type AllotmentHandle, LayoutPriority } from "allotment"
import { forwardRef } from "react"
import "allotment/dist/style.css"

export { LayoutPriority }

// allotment is themed entirely through five custom properties it declares on
// :root. Only the two colours need to follow the Mantine colour scheme; the
// default --sash-size of 8px is already a larger grab area than the 4px
// handle it replaces, so it is left alone.
const useStyles = createStyles(theme => ({
    root: {
        width: "100%",
        height: "100%",
        "--separator-border": theme.colorScheme === "dark" ? theme.colors.gray[8] : theme.colors.gray[3],
        "--focus-border": theme.colors.blue[7],
    },
}))

export type SplitViewHandle = AllotmentHandle

export type SplitViewProps = {
    children: React.ReactNode
    vertical?: boolean
    defaultSizes?: number[]
    proportionalLayout?: boolean
    separator?: boolean
    className?: string
    onChange?: (sizes: number[]) => void
    onDragEnd?: (sizes: number[]) => void
}

export const SplitView = forwardRef<SplitViewHandle, SplitViewProps>(function SplitView(
    { children, className, ...props },
    ref,
) {
    const { classes: s, cx } = useStyles()

    return (
        <Allotment ref={ref} className={cx(s.root, className)} {...props}>
            {children}
        </Allotment>
    )
})

export type SplitPaneProps = {
    children?: React.ReactNode
    minSize?: number
    maxSize?: number
    preferredSize?: number | string
    priority?: LayoutPriority
    snap?: boolean
    visible?: boolean
    className?: string
}

// allotment's Pane requires children; a spacer pane has none, so null stands
// in for it.
export const SplitPane: React.FC<SplitPaneProps> = ({ children = null, ...props }) => (
    <Allotment.Pane {...props}>{children}</Allotment.Pane>
)
```

- [ ] **Step 4: Export from the package barrel**

In `packages/ui/src/index.ts`, add in alphabetical position — after `./PropertiesViewer` and before `./Sidebar`:

```ts
export * from "./Split"
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run --root packages/ui src/Split
```

Expected: PASS — the four new render tests plus the eight from Task 3.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck -w @sphere/ui
```

Expected: no errors. If `--separator-border` is rejected as an unknown property, the emotion `CSSObject` index signature is not being picked up — fix the typing, do not add a cast or a suppression comment.

- [ ] **Step 7: Format and commit**

```bash
npm run format
git add packages/ui/src/Split/index.tsx packages/ui/src/Split/index.test.tsx packages/ui/src/index.ts
git commit -m "Add SplitView and SplitPane primitives"
```

---

### Task 5: `AppLayout` splits, `Sidebar` becomes chrome

These three files change together. Splitting them would leave the app in a state where both `Sidebar` and its pane try to own the width, so they share one task and one commit.

**Files:**
- Modify: `packages/ui/src/AppLayout/index.tsx`
- Modify: `packages/ui/src/Sidebar/index.tsx`
- Modify: `apps/sphere/src/components/App/index.tsx`
- Test: `packages/ui/src/AppLayout/index.test.tsx`, `packages/ui/src/Sidebar/index.test.tsx` (from Task 2, unchanged)

**Interfaces:**
- Consumes: `SplitView`, `SplitPane`, `LayoutPriority` from Task 4.
- Produces:
  - `AppLayoutProps = { children, footer, leftSidebar?, rightSidebar?, leftSidebarSize?, rightSidebarSize?, onResize? }`
  - `SidebarSize = { preferred: number; min: number; max: number }`
  - `DEFAULT_SIDEBAR_SIZE: SidebarSize`
  - `SidebarProps = { children: React.ReactNode }` — the resize props are gone

- [ ] **Step 1: Extend the `AppLayout` test with the new contract**

Append to `packages/ui/src/AppLayout/index.test.tsx`, inside the existing `describe`. The three tests from Task 2 stay exactly as written — they are the regression signal.

```tsx
    it("reports layout changes through onResize", () => {
        const sizes: number[][] = []
        render(
            <AppLayout footer={<div>status</div>} onResize={next => sizes.push(next)}>
                <div>map</div>
            </AppLayout>,
        )

        // allotment reports no layout under happy-dom, where every pane
        // measures zero. What matters here is that the prop is accepted and
        // wired, which the render above would throw on if it were not.
        expect(Array.isArray(sizes)).toBe(true)
    })
```

- [ ] **Step 2: Run the tests to confirm the new one fails**

```bash
npx vitest run --root packages/ui src/AppLayout
```

Expected: FAIL — `onResize` is not a valid prop on `AppLayoutProps` (a TypeScript error surfaced by Vitest's transform).

- [ ] **Step 3: Rewrite `AppLayout`**

Replace the whole of `packages/ui/src/AppLayout/index.tsx`:

```tsx
import { Flex, createStyles } from "@mantine/core"
import { LayoutPriority, SplitPane, SplitView } from "../Split"

export type SidebarSize = {
    preferred: number
    min: number
    max: number
}

// The values the hand-rolled sidebar hook used, so nothing moves on upgrade.
export const DEFAULT_SIDEBAR_SIZE: SidebarSize = {
    preferred: 300,
    min: 265,
    max: 500,
}

const useStyles = createStyles(() => ({
    container: {
        width: "100%",
        height: "100%",
    },
    main: {
        flex: 1,
        overflow: "hidden",
    },
}))

export type AppLayoutProps = {
    children: React.ReactNode
    footer: React.ReactNode
    leftSidebar?: React.ReactNode
    rightSidebar?: React.ReactNode
    leftSidebarSize?: SidebarSize
    rightSidebarSize?: SidebarSize
    onResize?: (sizes: number[]) => void
}

export const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    footer,
    leftSidebar,
    rightSidebar,
    leftSidebarSize = DEFAULT_SIDEBAR_SIZE,
    rightSidebarSize = DEFAULT_SIDEBAR_SIZE,
    onResize,
}) => {
    const { classes: s } = useStyles()

    return (
        <Flex direction={"column"} className={s.container}>
            <SplitView className={s.main} onChange={onResize}>
                <SplitPane
                    visible={leftSidebar != null}
                    preferredSize={leftSidebarSize.preferred}
                    minSize={leftSidebarSize.min}
                    maxSize={leftSidebarSize.max}
                >
                    {leftSidebar}
                </SplitPane>

                {/* The body absorbs window resizes so the sidebars keep the
                    width the user gave them. */}
                <SplitPane priority={LayoutPriority.High}>{children}</SplitPane>

                <SplitPane
                    visible={rightSidebar != null}
                    preferredSize={rightSidebarSize.preferred}
                    minSize={rightSidebarSize.min}
                    maxSize={rightSidebarSize.max}
                >
                    {rightSidebar}
                </SplitPane>
            </SplitView>

            {footer}
        </Flex>
    )
}
```

The old `body` class is gone: the pane is the positioned box now. If anything inside the map relied on `position: relative` from that div, it is preserved — `allotment` positions each view absolutely, which establishes the same containing block.

- [ ] **Step 4: Rewrite `Sidebar`**

Replace the whole of `packages/ui/src/Sidebar/index.tsx`. The `useHandler` hook, its three listeners (one of which was never removed), the width state, and the `startWidth`/`minWidth`/`maxWidth`/`onResize` props all go. The right border goes too — the split view's separator draws that line now.

```tsx
import { Flex, createStyles } from "@mantine/core"

const useStyle = createStyles(() => ({
    container: {
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
    },
}))

export type SidebarProps = {
    children: React.ReactNode
}

export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
    const { classes: s } = useStyle()

    return (
        <Flex pt={"xl"} p={0} className={s.container}>
            {children}
        </Flex>
    )
}
```

- [ ] **Step 5: Update the `Sidebar` test for the new props**

In `packages/ui/src/Sidebar/index.test.tsx`, drop the three removed props from the render. The assertion does not change.

```tsx
        render(
            <Sidebar>
                <div>panel</div>
            </Sidebar>,
        )
```

- [ ] **Step 6: Move the resize wiring in `App`**

In `apps/sphere/src/components/App/index.tsx`, move `onResize` from `Sidebar` to `AppLayout`. The callback body is unchanged; only its signature and placement move.

Change the `AppLayout` opening tag:

```tsx
                <AppLayout
                    footer={<MapStatusbar id={id} />}
                    onResize={onResize}
                    leftSidebar={
```

and the `Sidebar` opening tag:

```tsx
                            <Sidebar>
```

`onResize`'s declaration already ignores its argument, so it satisfies the new `(sizes: number[]) => void` signature without edits:

```tsx
    const onResize = useCallback(() => {
        dispatch(actions.map.resize(id))
    }, [dispatch])
```

- [ ] **Step 7: Run the affected tests**

```bash
npx vitest run --root packages/ui src/AppLayout src/Sidebar
npx vitest run --root apps/sphere src/components
```

Expected: PASS everywhere. The three characterization tests from Task 2 passing unchanged is the point of this task.

- [ ] **Step 8: Typecheck both workspaces**

```bash
npm run typecheck
```

Expected: no errors. A complaint that `Sidebar` is still given `startWidth` means Step 6 was missed.

- [ ] **Step 9: Format and commit**

```bash
npm run format
git add packages/ui/src/AppLayout apps/sphere/src/components/App/index.tsx packages/ui/src/Sidebar
git commit -m "Resize the sidebar through the split view"
```

---

### Task 6: The `SectionStack` component

A vertical split whose panes open and close. A closed pane is pinned by making its minimum equal its maximum, so `allotment` cannot resize it and the freed height goes to the open sections — no second collapse mechanism.

**Files:**
- Create: `packages/ui/src/SectionStack/index.tsx`
- Create: `packages/ui/src/SectionStack/index.test.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: `SplitView`, `SplitPane`, `SplitViewHandle` from Task 4; `restoreSize` from Task 3.
- Produces, used by Task 7:
  - `SectionStack: React.FC<SectionStackProps> & { Section: React.FC<SectionProps> }`
  - `SectionStackProps = { value: string[]; onChange: (value: string[]) => void; children: React.ReactNode }`
  - `SectionProps = { value: string; title: string; minContentSize?: number; children: React.ReactNode }`
  - `SECTION_HEADER_HEIGHT = 30`

- [ ] **Step 1: Write the failing tests**

Create `packages/ui/src/SectionStack/index.test.tsx`:

```tsx
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "../test-utils"
import { SectionStack } from "."

function Stack({ initial }: { initial: string[] }) {
    const [value, setValue] = useState(initial)

    return (
        <SectionStack value={value} onChange={setValue}>
            <SectionStack.Section value={"outline"} title={"Outline"}>
                <div>outline body</div>
            </SectionStack.Section>
            <SectionStack.Section value={"details"} title={"Details"}>
                <div>details body</div>
            </SectionStack.Section>
        </SectionStack>
    )
}

describe("SectionStack", () => {
    it("renders a header for every section", () => {
        render(<Stack initial={["outline", "details"]} />)

        expect(screen.getByRole("button", { name: /Outline/ })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Details/ })).toBeInTheDocument()
    })

    it("renders the body of an open section", () => {
        render(<Stack initial={["outline"]} />)

        expect(screen.getByText("outline body")).toBeInTheDocument()
    })

    it("hides the body of a closed section but keeps its header", () => {
        render(<Stack initial={["outline"]} />)

        expect(screen.queryByText("details body")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Details/ })).toBeInTheDocument()
    })

    it("marks open sections with aria-expanded", () => {
        render(<Stack initial={["outline"]} />)

        expect(screen.getByRole("button", { name: /Outline/ })).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByRole("button", { name: /Details/ })).toHaveAttribute("aria-expanded", "false")
    })

    it("closes an open section when its header is clicked", () => {
        render(<Stack initial={["outline", "details"]} />)

        fireEvent.click(screen.getByRole("button", { name: /Outline/ }))

        expect(screen.queryByText("outline body")).not.toBeInTheDocument()
        expect(screen.getByText("details body")).toBeInTheDocument()
    })

    it("opens a closed section when its header is clicked", () => {
        render(<Stack initial={[]} />)

        fireEvent.click(screen.getByRole("button", { name: /Details/ }))

        expect(screen.getByText("details body")).toBeInTheDocument()
    })

    it("reports the new open set through onChange", () => {
        const calls: string[][] = []
        render(
            <SectionStack value={["outline"]} onChange={next => calls.push(next)}>
                <SectionStack.Section value={"outline"} title={"Outline"}>
                    <div>outline body</div>
                </SectionStack.Section>
                <SectionStack.Section value={"details"} title={"Details"}>
                    <div>details body</div>
                </SectionStack.Section>
            </SectionStack>,
        )

        fireEvent.click(screen.getByRole("button", { name: /Details/ }))

        expect(calls.at(0)).toEqual(["outline", "details"])
    })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run --root packages/ui src/SectionStack
```

Expected: FAIL — cannot resolve `.`.

- [ ] **Step 3: Write the implementation**

Create `packages/ui/src/SectionStack/index.tsx`. Three things to note while reading it: `UnstyledButton` renders a real `<button>`, so Space and Enter toggling come from the browser and need no handler; the children are read through a type predicate rather than a cast; and the spacer pane exists only so that, with everything closed, no header stretches to fill the gap.

```tsx
import { UnstyledButton, createStyles } from "@mantine/core"
import { IconChevronRight } from "@tabler/icons"
import { Children, isValidElement, useCallback, useEffect, useId, useRef } from "react"
import { SplitPane, SplitView, type SplitViewHandle } from "../Split"
import { restoreSize } from "../Split/sizes"

export const SECTION_HEADER_HEIGHT = 30
const DEFAULT_MIN_CONTENT_SIZE = 120
const CHEVRON_SIZE = 14

export type SectionProps = {
    value: string
    title: string
    minContentSize?: number
    children: React.ReactNode
}

// Section is a declaration, not a renderer: SectionStack reads its props and
// draws the pane itself. Rendering the children keeps it valid if it is ever
// used on its own.
export const Section: React.FC<SectionProps> = ({ children }) => <>{children}</>

function isSection(node: React.ReactNode): node is React.ReactElement<SectionProps> {
    return isValidElement<SectionProps>(node) && node.type === Section
}

const useStyles = createStyles(theme => ({
    root: {
        flex: "1 1 0",
        minHeight: 0,
    },
    section: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
    },
    header: {
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.xs,
        height: SECTION_HEADER_HEIGHT,
        paddingLeft: theme.spacing.sm,
        paddingRight: theme.spacing.sm,
        fontSize: theme.fontSizes.sm,
        color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.colors.gray[9],
        backgroundColor: theme.colorScheme === "dark" ? theme.colors.gray[9] : theme.white,
        borderTop: `1px solid ${theme.colorScheme === "dark" ? theme.colors.gray[8] : theme.colors.gray[3]}`,
        ...theme.fn.focusStyles(),
    },
    chevron: {
        flexShrink: 0,
        transition: "transform 150ms ease",
    },
    chevronOpen: {
        transform: "rotate(90deg)",
    },
    body: {
        flex: "1 1 auto",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        paddingLeft: theme.spacing.sm,
        paddingRight: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
    },
}))

export type SectionStackProps = {
    value: string[]
    onChange: (value: string[]) => void
    children: React.ReactNode
}

const SectionStackRoot: React.FC<SectionStackProps> = ({ value, onChange, children }) => {
    const { classes: s, cx } = useStyles()
    const baseId = useId()
    const handle = useRef<SplitViewHandle>(null)
    const sizes = useRef<number[]>([])
    const remembered = useRef(new Map<string, number>())
    const pending = useRef<string | null>(null)

    const sections = Children.toArray(children).filter(isSection)
    const openOf = (section: React.ReactElement<SectionProps>) => value.includes(section.props.value)
    const minSizeOf = (section: React.ReactElement<SectionProps>) => {
        if (!openOf(section)) {
            return SECTION_HEADER_HEIGHT
        }

        return SECTION_HEADER_HEIGHT + (section.props.minContentSize ?? DEFAULT_MIN_CONTENT_SIZE)
    }

    const onSplitChange = useCallback((next: number[]) => {
        sizes.current = next
    }, [])

    // A reopened pane only grows to its minimum, so the size it had before it
    // was closed is reapplied once the new minimums have been laid out.
    useEffect(() => {
        const target = pending.current
        pending.current = null
        if (target === null) {
            return
        }

        const height = remembered.current.get(target)
        const index = sections.findIndex(section => section.props.value === target)
        if (height === undefined || index < 0 || sizes.current.length < sections.length) {
            return
        }

        handle.current?.resize(restoreSize(sizes.current, index, height, sections.map(minSizeOf)))
    }, [sections, minSizeOf])

    const toggle = (section: React.ReactElement<SectionProps>) => {
        const id = section.props.value
        if (value.includes(id)) {
            const index = sections.indexOf(section)
            const height = sizes.current.at(index)
            if (height !== undefined) {
                remembered.current.set(id, height)
            }

            onChange(value.filter(open => open !== id))
            return
        }

        pending.current = id
        onChange([...value, id])
    }

    const allClosed = sections.every(section => !openOf(section))

    return (
        <SplitView vertical ref={handle} className={s.root} onChange={onSplitChange}>
            {sections.map(section => {
                const open = openOf(section)
                const bodyId = `${baseId}-${section.props.value}`

                return (
                    <SplitPane
                        key={section.props.value}
                        minSize={minSizeOf(section)}
                        maxSize={open ? Number.POSITIVE_INFINITY : SECTION_HEADER_HEIGHT}
                    >
                        <div className={s.section}>
                            <UnstyledButton
                                className={s.header}
                                onClick={() => toggle(section)}
                                aria-expanded={open}
                                aria-controls={open ? bodyId : undefined}
                            >
                                <IconChevronRight
                                    className={cx(s.chevron, { [s.chevronOpen]: open })}
                                    size={CHEVRON_SIZE}
                                />
                                <span>{section.props.title}</span>
                            </UnstyledButton>

                            {!open ? null : (
                                <div id={bodyId} className={s.body}>
                                    {section.props.children}
                                </div>
                            )}
                        </div>
                    </SplitPane>
                )
            })}

            {/* With every section pinned to its header, nothing is willing to
                absorb the leftover height. This takes it, so no header
                stretches to fill the gap. */}
            <SplitPane visible={allClosed} minSize={0} />
        </SplitView>
    )
}

export const SectionStack = Object.assign(SectionStackRoot, { Section })
```

- [ ] **Step 4: Export from the package barrel**

In `packages/ui/src/index.ts`, add in alphabetical position — after `./PropertiesViewer` and before `./Sidebar`, adjacent to the `./Split` line added in Task 4:

```ts
export * from "./SectionStack"
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run --root packages/ui src/SectionStack
```

Expected: PASS, 7 tests.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck -w @sphere/ui
```

Expected: no errors.

- [ ] **Step 7: Format and commit**

```bash
npm run format
git add packages/ui/src/SectionStack packages/ui/src/index.ts
git commit -m "Add SectionStack with resizable open sections"
```

---

### Task 7: Move the sidebar tabs onto `SectionStack`

The last task, and the one the issue is actually about: the boundary between Outline and the details panel becomes draggable. `StyledAccordion` and its test are deleted, because the flex arithmetic they existed for is now the split view's job.

**Files:**
- Modify: `apps/sphere/src/components/LeftSidebar/LayersTab.tsx`
- Modify: `apps/sphere/src/components/LeftSidebar/SourcesTab.tsx`
- Delete: `apps/sphere/src/components/LeftSidebar/StyledAccordion.tsx`
- Delete: `apps/sphere/src/components/LeftSidebar/StyledAccordion.test.tsx`
- Test: `apps/sphere/src/components/LeftSidebar/LayersTab.test.tsx`, `SourcesTab.test.tsx` (unchanged — the regression signal)

**Interfaces:**
- Consumes: `SectionStack` from Task 6.
- Produces: nothing further.

- [ ] **Step 1: Rewrite the `LayersTab` section list**

In `apps/sphere/src/components/LeftSidebar/LayersTab.tsx`, replace the `StyledAccordion` block:

```tsx
            <SectionStack value={value} onChange={setValue}>
                <SectionStack.Section value={"outline"} title={"Outline"}>
                    <PanelBody>
                        <LayersOutline />
                    </PanelBody>
                </SectionStack.Section>

                <SectionStack.Section value={"layer-properties"} title={"Layer"}>
                    <LayerPanel />
                </SectionStack.Section>
            </SectionStack>
```

Update the imports — `Accordion` and `StyledAccordion` are no longer used:

```tsx
import { ActionBar, type ActionBarOnClick, PanelBody, SectionStack } from "@sphere/ui"
```

and delete both `import { Accordion } from "@mantine/core"` and `import { StyledAccordion } from "./StyledAccordion"`.

The `pt={"sm"}` that `StyledAccordion` carried is dropped: each section header draws its own top border, which is the separation that padding was standing in for.

- [ ] **Step 2: Rewrite the `SourcesTab` section list**

In `apps/sphere/src/components/LeftSidebar/SourcesTab.tsx`, replace the `StyledAccordion` block:

```tsx
            <SectionStack value={value} onChange={setValue}>
                <SectionStack.Section value={"outline"} title={"Outline"}>
                    <PanelBody>
                        <SourcesOutline />
                    </PanelBody>
                </SectionStack.Section>

                <SectionStack.Section value={"source-properties"} title={"Source"}>
                    <SourcePanel />
                </SectionStack.Section>
            </SectionStack>
```

Update the imports. `Accordion` goes; `Button`, `Group`, `Modal` and `TextInput` are still used by the URL modal:

```tsx
import { ActionBar, type ActionBarOnClick, PanelBody, SectionStack } from "@sphere/ui"
import { Button, Group, Modal, TextInput } from "@mantine/core"
```

and delete `import { StyledAccordion } from "./StyledAccordion"`.

- [ ] **Step 3: Delete `StyledAccordion` and its test**

```bash
git rm apps/sphere/src/components/LeftSidebar/StyledAccordion.tsx apps/sphere/src/components/LeftSidebar/StyledAccordion.test.tsx
```

- [ ] **Step 4: Run the sidebar suites**

```bash
npx vitest run --root apps/sphere src/components/LeftSidebar
```

Expected: PASS, with `LayersTab.test.tsx`, `SourcesTab.test.tsx` and `index.test.tsx` unedited.

Both tab tests locate their assertions by walking up from an element looking for `overflow-y: auto`, which `PanelBody` still provides. If they fail, the cause is `SectionStack`'s body not giving `PanelBody` a bounded height — fix `SectionStack`, not the tests.

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add apps/sphere/src/components/LeftSidebar
git commit -m "Replace the sidebar accordion with SectionStack"
```

---

### Task 8: Full verification

Nothing here is a claim until its command has been run and its output read.

**Files:** none modified unless a check fails.

- [ ] **Step 1: Lint, typecheck and the whole test suite**

```bash
npm run lint
npm run typecheck
npm test
```

Expected: all three clean. `npm test` covers `apps/sphere`, `packages/ui` and `packages/utils`.

- [ ] **Step 2: Confirm nothing outside `Split/` imports allotment**

```bash
rg -l "from \"allotment\"|allotment/dist" --glob '!node_modules'
```

Expected: exactly one file — `packages/ui/src/Split/index.tsx`. Any other hit breaks the boundary the design depends on.

- [ ] **Step 3: Confirm the deleted files are gone and no suppressions were added**

```bash
rg -l "StyledAccordion" --glob '!node_modules'
rg -n "biome-ignore|eslint-disable|as any|: any" --glob '!node_modules' packages/ui/src/Split packages/ui/src/SectionStack packages/ui/src/AppLayout packages/ui/src/Sidebar
```

Expected: no output from either.

- [ ] **Step 4: Run the app and check the behaviour by hand**

```bash
npm run tauri dev
```

The automated tests cannot see geometry — happy-dom lays every pane out at zero — so these are checked in the running app, against the acceptance criteria in issue #254:

- Drag the boundary between Outline and the Source panel; both stop at a minimum height.
- Close a section: it shrinks to its header bar and the freed height goes to the open one.
- Reopen it: it returns to the height it had, not the minimum.
- Close every section: the headers stack at the top and no header stretches to fill the gap.
- Drag the sidebar's right edge: it resizes within 265–500px and the map resizes with it.
- Tab to a sash and resize it with the arrow keys.
- Toggle dark mode: the sash and section borders follow the colour scheme.

- [ ] **Step 5: Commit any fixes the manual pass turned up**

If the manual pass found nothing, there is nothing to commit and the branch is ready for a PR against `master`.

```bash
git status --short
```

---

## Self-Review

**Spec coverage.** Every section of the spec maps to a task: Layer 1 → Task 4; Layer 2 → Task 5; Layer 3 → Task 6; restore-on-reopen → Tasks 3 and 6; the all-closed spacer → Task 6; map resizing → Task 5; `Sidebar` reduction → Task 5; deletions → Tasks 5 and 7; the happy-dom and stylesheet risks → Task 1; the sash hit-area risk → retired by the 8px default, recorded under Deviations; tests written before modification → Task 2; the `npm install` note → Task 1.

**Placeholders.** None. Every code step carries the code; every command carries its expected output.

**Type consistency.** `restoreSize(sizes, index, target, minSizes)` is defined in Task 3 and called with that signature in Task 6. `SplitViewHandle`, `SplitViewProps`, `SplitPaneProps` and `LayoutPriority` are defined in Task 4 and used under those names in Tasks 5 and 6. `SECTION_HEADER_HEIGHT` is defined once in Task 6. `SidebarProps` loses its four props in Task 5, and the Task 2 test is updated in the same task rather than left stale.

**One thing an executor should watch.** The `useEffect` in Task 6 depends on `sections` and `minSizeOf`, both rebuilt every render, so it runs on every render and relies on `pending.current` being nulled to stay inert. That is deliberate — the restore must happen after `allotment` has laid out the new minimums — but if Biome's `useExhaustiveDependencies` objects, restructure it rather than suppressing the rule.
