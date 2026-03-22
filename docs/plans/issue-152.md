# Pan Mode Toggle

## Context

MapLibre pans by default when the user drags the map. We want a toggle in the status bar to enable/disable pan mode. When disabled the map is frozen — no drag-to-pan — so the user can freely click and drag without moving the map. The implementation uses a new `tools` Redux slice where state is `activeTool: Tool | null` (an active tool name or none), designed for future extension with more tools.

---

## State Design

```ts
type Tool = "pan"  // extend union as new tools are added

type ToolsState = {
    activeTool: Tool | null
}

initialState = { activeTool: "pan" }  // pan active by default
```

- `activeTool === "pan"` → pan enabled, map interactive normally
- `activeTool === null` → no tool active, map frozen (dragPan disabled)

---

## Plan

### Task 1: Create `src/store/tools.ts`
- [ ] Define `type Tool = "pan"` and `ToolsState = { activeTool: Tool | null }`
- [ ] `createSlice` named `"tools"`, `initialState = { activeTool: "pan" }`
- [ ] Reducer: `setTool(state, action: PayloadAction<Tool | null>)` sets `activeTool`
- [ ] Inline `selectors`: `selectActiveTool`, `selectPanEnabled: state => state.activeTool === "pan"`
- [ ] Export `toolsSlice` and default reducer

### Task 2: Register in store files
- [ ] `src/store/index.ts` — add `tools: toolsReducer` to `configureStore.reducer`
- [ ] `src/store/actions.ts` — add `tools: toolsSlice.actions`
- [ ] `src/store/selectors.ts` — import `toolsSlice`, add `tools: tools.selectors` to `selectors` object

### Task 3: Create `src/hooks/usePanMode.ts`
- [ ] Accept `ref?: MapRef` (same signature as `useZoom`, `usePitch`)
- [ ] Read `panEnabled` via `useAppSelector(selectors.tools.selectPanEnabled)`
- [ ] `useEffect` on `[ref, panEnabled]`: call `ref.getMap().dragPan.enable()` or `.disable()`
- [ ] Return `void`

### Task 4: Mount hook + add button in `src/components/MapStatusbar/index.tsx`
- [ ] Call `usePanMode(ref)` (ref already available from `useMap()`)
- [ ] `useAppSelector(selectors.tools.selectPanEnabled)` for button state
- [ ] On click: `dispatch(actions.tools.setTool(panEnabled ? null : "pan"))`
- [ ] Use `IconHandMove` (or `IconHandStop`) from `@tabler/icons`
- [ ] Apply `s.active` class when `panEnabled === true`
- [ ] Place button left of the spacer `<div className={s.s} />`

### Task 5: Format
- [ ] Run `npm run format`

---

## Critical Files

| File                                    | Change        |
|-----------------------------------------|---------------|
| `src/store/tools.ts`                    | Create new    |
| `src/store/index.ts`                    | Add reducer   |
| `src/store/actions.ts`                  | Add actions   |
| `src/store/selectors.ts`               | Add selectors |
| `src/hooks/usePanMode.ts`              | Create new    |
| `src/components/MapStatusbar/index.tsx` | Mount + UI    |

---

## Verification

1. `npm run dev` → open app
2. Statusbar shows a hand/move icon, highlighted by default (pan enabled)
3. Click icon → dims → dragging does not pan the map
4. Click again → highlights → pan resumes
5. `npm test` — no regressions
6. `npm run lint` — clean
