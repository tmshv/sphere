# Resizable panel layout

Replace the bespoke sidebar resize hook and the accordion-based sidebar
sections with a composable split-view layout built on `allotment`.

## Problem

The sidebar is resizable, but nothing inside it is. `Sidebar`
(`packages/ui/src/Sidebar/index.tsx`) implements dragging by hand: a
`useHandler` hook attaches `mousedown`/`mousemove`/`mouseup` listeners and
keeps the width in local `useState`. Inside the sidebar, sections are Mantine
`Accordion` items whose heights are decided by CSS flex rules in
`StyledAccordion`; the user cannot give the Outline more room and the Source
panel less.

Three things are wrong with the current arrangement:

1. **Only one axis is resizable.** There is no way to drag the boundary
   between Outline and the Source/Layer panel.
2. **The mechanism does not compose.** `useHandler` resizes exactly one
   element against the viewport. It cannot express a right sidebar, a bottom
   dock, or a split main area.
3. **The hook leaks.** Its cleanup removes the document-level `mouseup` and
   `mousemove` listeners but never the element's `mousedown` listener — the
   source has a commented-out line admitting this.

## Goals

- A horizontal drag handle between sections inside the sidebar.
- The existing vertical sidebar handle keeps working, through the same
  mechanism.
- Layout primitives general enough to later express a right sidebar and a
  split main area without redesign.
- Sections keep their open/closed behaviour; closed sections shrink to their
  header bar.

## Non-goals

- Persisting sizes across app restarts. Sizes are session-only, matching the
  sidebar's behaviour today.
- A bottom dock panel. The primitives must not preclude one; this change does
  not build one.
- Drag-to-reorder sections.
- Any change to what the sections contain.

## Decisions

| Decision            | Choice                                         |
| Library             | `allotment` 1.20.5                             |
| Sections open/close | Kept, driven by a controlled array of open ids |
| Closed section      | Stays a pane, pinned to header height          |
| Mantine `Accordion` | Dropped; headers built from Mantine primitives |
| Size persistence    | None — session only                            |
| Map resize wiring   | `AppLayout` split `onChange`, not per-sidebar  |

`allotment` peer-depends on React 17–19, so React 18 is supported. It renders
a VS Code-style split view with sash handles, mouse and touch dragging, and
snap-to-zero.

### Verified library behaviour

These were checked against the published `allotment@1.20.5` package, because
the design depends on them:

- **`Pane` reacts to `minSize`/`maxSize` prop changes.** `dist/module.js:1156`
  compares the incoming values against the stored ones and calls `layout()`
  when either differs. The collapsed-section model below relies on this.
- **There is no `collapsedSize` prop.** `Pane` has `visible`, which is
  all-or-nothing (size 0). Collapsing to header height must be expressed
  through `minSize`/`maxSize`.
- **Theming is five CSS custom properties**: `--sash-size`,
  `--sash-hover-size`, `--sash-hover-transition-duration`,
  `--separator-border`, `--focus-border`. Internal class names are hashed CSS
  modules and cannot be targeted, but the variables cover every visual.
- **The stylesheet must be imported**: `allotment/dist/style.css`.
- **The imperative handle** is `{ reset(): void; resize(sizes: number[]): void }`.

## Architecture

Three layers, each usable without the one above it.

```
AppLayout                      ← app shell: sidebars | body | footer
  └── SplitView / SplitPane    ← @sphere/ui primitives over allotment
        └── SectionStack       ← @sphere/ui: open/closable resizable sections
```

### Layer 1 — `SplitView` / `SplitPane`

New directory `packages/ui/src/Split/`, exported from the package barrel.

`SplitView` wraps `Allotment`. It owns the single
`import "allotment/dist/style.css"` in the codebase and sets the five CSS
variables from the Mantine theme through `createStyles`, so sash colours
follow `colorScheme` without any further wiring. It forwards `vertical`,
`onChange`, `onDragEnd`, `defaultSizes` and its ref.

`SplitPane` wraps `Allotment.Pane`, forwarding `minSize`, `maxSize`,
`preferredSize`, `priority`, `snap` and `visible`.

`allotment`'s root barrel exports only `Allotment`, `AllotmentHandle`,
`AllotmentProps`, `LayoutPriority` and `setSashSize` — `PaneProps` is not
among them. `SplitPane` therefore declares its own props type rather than
re-exporting one, which keeps it free of `as` casts and `any`.

No file outside `packages/ui/src/Split/` imports `allotment`. This keeps the
dependency swappable and follows the repo's "one place per concept" rule.

Dependency declaration follows the existing Mantine pattern: `allotment` is a
`peerDependency` of `@sphere/ui` and a `dependency` of `apps/sphere`.

### Layer 2 — `AppLayout`

`AppLayout`'s body row becomes a horizontal `SplitView` with three panes:

```tsx
<Flex direction="column" className={s.container}>
    <SplitView onChange={onLayoutChange} className={s.main}>
        <SplitPane
            visible={leftSidebar != null}
            preferredSize={leftSidebarSize.preferred}
            minSize={leftSidebarSize.min}
            maxSize={leftSidebarSize.max}
        >
            {leftSidebar}
        </SplitPane>

        <SplitPane priority={LayoutPriority.High}>{children}</SplitPane>

        <SplitPane visible={rightSidebar != null} /* … */>{rightSidebar}</SplitPane>
    </SplitView>

    {footer}
</Flex>
```

Sizes arrive as optional props defaulting to today's values — preferred 300,
min 265, max 500 — so `App` need not restate them. The main pane takes
`LayoutPriority.High` so that resizing the window changes the map rather than
the sidebars.

`visible` is derived from whether the node is non-null, so `App` keeps its
current `!left ? null : <Sidebar>` shape and the show/hide behaviour is
unchanged. The tradeoff is that toggling a sidebar unmounts its contents
rather than sliding it out — the same as today.

### Layer 3 — `SectionStack`

New directory `packages/ui/src/SectionStack/`, exported from the barrel. It is
controlled and mirrors `StyledAccordion`'s current contract, so the tab
components change very little:

```tsx
<SectionStack value={value} onChange={setValue}>
    <SectionStack.Section value="outline" title="Outline" minContentSize={120}>
        <PanelBody>
            <LayersOutline />
        </PanelBody>
    </SectionStack.Section>

    <SectionStack.Section value="layer-properties" title="Layer">
        <LayerPanel />
    </SectionStack.Section>
</SectionStack>
```

It renders a vertical `SplitView` holding one `SplitPane` per section. Each
section draws a header — an `UnstyledButton` with a chevron, carrying
`aria-expanded` and `aria-controls`, toggling on click and on Space/Enter —
and below it the section body.

Sizing per section:

| State  | `minSize`                        | `maxSize`       | Sash      |
| Open   | `HEADER_HEIGHT + minContentSize` | unset           | Draggable |
| Closed | `HEADER_HEIGHT`                  | `HEADER_HEIGHT` | Pinned    |

`HEADER_HEIGHT` is `30`, the value `StyledAccordion` uses for its control
today, defined once as a named constant. `minContentSize` defaults to `120`.

Because a closed pane's minimum equals its maximum, `allotment` cannot resize
it and the freed space goes to the open sections — which is the required
behaviour, without a second collapse mechanism.

Dragging a sash never closes a section. Closing is the header control's job
only. This avoids a feedback loop between drag state and the controlled
`value` array.

#### When every section is closed

With every pane pinned, the pinned heights no longer add up to the container
height and there is no pane willing to absorb the remainder. The required
behaviour is that the closed headers stack at the top and the leftover space
stays empty — no header stretches to fill it.

`SectionStack` guarantees this with a trailing spacer `SplitPane`, rendered
with `visible` set only while every section is closed, `minSize={0}` and no
content. It absorbs the remainder and disappears as soon as one section
opens. Whether `allotment` already behaves this way without the spacer is
checked during the probe described under Risks; the spacer is dropped if it
turns out to be unnecessary.

#### Restoring size on reopen

`allotment` grows a reopened pane to its `minSize` and no further, so a
section that was 300px tall before being closed comes back at its minimum.
`SectionStack` therefore records sizes from `SplitView`'s `onChange` and, when
a section opens, calls the handle's `resize()` with a recomputed array.

The arithmetic lives in a pure helper, `packages/ui/src/Split/sizes.ts`:

```ts
export function restoreSize(
    sizes: number[],
    index: number,
    target: number,
    minSizes: number[],
): number[]
```

It gives the section at `index` its remembered size, takes the difference from
the other sections in proportion to their current sizes, and clamps every
result at its own minimum — distributing any shortfall back if the clamps make
the total fall short. It touches no DOM and is unit-tested directly, which
keeps the logic out of the component per the repo's state-management rules.

If a section has no remembered size — first open of the session — no
`resize()` call is made and `allotment`'s own layout decides.

### Map resizing

`AppLayout` calls `onChange` on every drag, and `App` passes a handler that
dispatches `map.resize(id)`. This replaces `Sidebar`'s `onResize` prop, which
is removed. One wiring point now covers the left sidebar, the right sidebar
and any future split of the main area.

The `force-resize` listener (`apps/sphere/src/store/listeners/force-resize.ts`)
is unchanged. It covers show/hide and zen-mode transitions, which do not
produce a drag.

### `Sidebar`

`Sidebar` keeps existing as chrome — the right border and the top padding —
and loses everything else: `useHandler`, the three listeners, the width state,
and the `startWidth` / `minWidth` / `maxWidth` / `onResize` props. Its pane
owns the width. The `mousedown` listener leak disappears with the hook.

### Deletions

- `useHandler` and the resize props in `packages/ui/src/Sidebar/index.tsx`
- `apps/sphere/src/components/LeftSidebar/StyledAccordion.tsx`
- `apps/sphere/src/components/LeftSidebar/StyledAccordion.test.tsx`

`PanelBody` is unchanged. A pane gives it the bounded height it already
requires.

## Risks

**`allotment` under happy-dom.** Tests run in happy-dom, where
`ResizeObserver` exists as a stub that never fires and
`getBoundingClientRect` returns zeros. Panes will therefore lay out at size 0.
Children are still rendered into the DOM, so assertions on text and on click
handlers are expected to hold — but if they do not, every sidebar test breaks
at once.

This is retired first, before anything is built: wrap the existing
`LeftSidebar` in an `Allotment` and run the existing suite. The wrapper is
throwaway. If the suite fails, a `ResizeObserver` and `getBoundingClientRect`
shim goes into `apps/sphere/src/setupTests.ts` and
`packages/ui/src/setupTests.ts` before the real work starts.

**Stylesheet resolution.** `@sphere/ui` is consumed as source (`main` is
`./src/index.ts`), so the app's Vite build resolves the CSS import. This works
in the app build and must also be confirmed not to break the Vitest runs,
which use the same Vite pipeline.

**Sash hit area.** The current sidebar handle is 4px. `--sash-size` must be
set so the handle is no harder to grab than it is today.

## Testing

The repo requires tests to exist before a file is modified. `AppLayout` and
`Sidebar` have none, so those are written first, against current behaviour,
and must still pass afterwards where behaviour is unchanged.

New tests:

- `Split/sizes.test.ts` — the pure helper: restoring within available space,
  shortfall against minimums, a single open section, a target larger than the
  container.
- `Split/index.test.tsx` — `SplitView` renders its panes and forwards
  `vertical`; `SplitPane` forwards `visible` and the size props.
- `SectionStack/index.test.tsx` — clicking a header calls `onChange` with the
  right ids; `aria-expanded` tracks `value`; a closed section renders its
  header and not its body content; with every section closed, the spacer pane
  is rendered and it is absent otherwise.

Tests written before modification:

- `AppLayout/index.test.tsx` — renders children, footer, and each sidebar when
  given; omits a sidebar when its node is null.
- `Sidebar/index.test.tsx` — renders children.

Regression signal: `LayersTab.test.tsx`, `SourcesTab.test.tsx` and
`LeftSidebar/index.test.tsx` must keep passing with no changes to their
assertions.

## Out-of-scope notes

`node_modules` is not installed in this worktree; `npm install` precedes
everything.

No `crates/` file is touched, so no Rust version bump applies. `@sphere/ui`
stays pinned at `0.0.0` per the repo's workspace policy.
