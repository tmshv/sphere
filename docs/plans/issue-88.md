# Split LayerPanel into Per-Type Controls

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract layer-type-specific controls from the monolithic `LayerPanel` component into individual files, reducing its size from 593 lines to ~250 lines.

**Architecture:** Each layer type gets its own controls component that receives `layerId`, `dispatch`, and the relevant slice of `layerSelector` output as props. The color picker is inlined into each component that uses it (Point, Line, Polygon, Extrusion). A `LayerFilter` component encapsulates the filter input and its validation logic. The main `LayerPanel` keeps selectors, common controls (action bar, name, source, source layer, view type), and delegates to the appropriate controls component via a switch on `layer.type`.

**Tech Stack:** React 18, Redux Toolkit, Mantine 5, MapLibre GL types

---

## File Structure

| File                                            | Responsibility                                                 |
|-------------------------------------------------|----------------------------------------------------------------|
| `src/components/LayerPanel/index.tsx`           | Selectors, common controls, delegates to type-specific controls |
| `src/components/LayerPanel/index.test.ts`       | Unchanged — tests selectors only                               |
| `src/components/LayerPanel/LayerFilter.tsx`     | Filter text input + JSON validation + clear button             |
| `src/components/LayerPanel/PointControls.tsx`   | Color picker + circle radius slider                            |
| `src/components/LayerPanel/LineControls.tsx`    | Color picker                                                   |
| `src/components/LayerPanel/PolygonControls.tsx` | Color picker                                                   |
| `src/components/LayerPanel/HeatmapControls.tsx` | Radius + intensity sliders                                     |
| `src/components/LayerPanel/PhotoControls.tsx`   | Cluster radius, image/value field selects, layout select       |
| `src/components/LayerPanel/ExtrusionControls.tsx` | Color picker + height/base sliders + height/base field selects |

## Conventions

- Arrow function components with `FC<Props>` type annotation
- Destructured imports from `"react"` (e.g. `import { type FC } from "react"`)
- No parens around single arrow function parameters
- `useAppDispatch` hook for dispatch (same as current)
- Run `npm run format` after each code change

---

### Task 1: Extract LayerFilter

**Files:**
- Create: `src/components/LayerPanel/LayerFilter.tsx`
- Modify: `src/components/LayerPanel/index.tsx`

- [ ] **Step 1: Create LayerFilter component**

Create `src/components/LayerPanel/LayerFilter.tsx`:

```tsx
import { isValidFilterExpression } from "@/lib/maplibre"
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { ActionIcon, TextInput } from "@mantine/core"
import { IconX } from "@tabler/icons"
import type { FilterSpecification } from "maplibre-gl"
import { type FC, useEffect, useState } from "react"

type LayerFilterProps = {
    layerId: string
    filterExpression: FilterSpecification | null
    filterError: string | null
}

export const LayerFilter: FC<LayerFilterProps> = ({ layerId, filterExpression, filterError }) => {
    const dispatch = useAppDispatch()
    const [filterText, setFilterText] = useState("")
    const [filterLocalError, setFilterLocalError] = useState<string | null>(null)

    useEffect(() => {
        setFilterText(filterExpression ? JSON.stringify(filterExpression) : "")
        setFilterLocalError(null)
    }, [layerId, filterExpression])

    function handleFilterChange(text: string) {
        setFilterText(text)
        if (!text.trim()) {
            setFilterLocalError(null)
            dispatch(actions.layer.setLayerFilter({ id: layerId, expression: null }))
            return
        }
        try {
            const expression = JSON.parse(text)
            if (Array.isArray(expression) && isValidFilterExpression(expression)) {
                setFilterLocalError(null)
                dispatch(
                    actions.layer.setLayerFilter({ id: layerId, expression: expression as FilterSpecification }),
                )
            }
        } catch {
            // don't show error while typing
        }
    }

    function handleFilterBlur() {
        if (!filterText.trim()) return
        try {
            const expression = JSON.parse(filterText)
            if (!Array.isArray(expression)) {
                setFilterLocalError("Filter must be a JSON array")
            } else if (!isValidFilterExpression(expression)) {
                setFilterLocalError("Invalid filter expression")
            }
        } catch {
            setFilterLocalError("Invalid JSON expression")
        }
    }

    function clearFilter() {
        setFilterText("")
        setFilterLocalError(null)
        dispatch(actions.layer.setLayerFilter({ id: layerId, expression: null }))
    }

    return (
        <TextInput
            size="xs"
            label="Filter"
            placeholder='["==", ["get", "field"], "value"]'
            value={filterText}
            error={filterLocalError ?? filterError ?? undefined}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            rightSection={
                filterText ? (
                    <ActionIcon size="xs" onClick={clearFilter}>
                        <IconX size={10} />
                    </ActionIcon>
                ) : null
            }
            onChange={e => handleFilterChange(e.currentTarget.value)}
            onBlur={handleFilterBlur}
        />
    )
}
```

- [ ] **Step 2: Replace filter logic in index.tsx with LayerFilter**

In `src/components/LayerPanel/index.tsx`:

1. Remove imports: `isValidFilterExpression`, `IconX`, `useState`, `useEffect`, and the `FilterSpecification` type
2. Remove `filterText`/`filterLocalError` state declarations
3. Remove the `useEffect` for filter sync
4. Remove `handleFilterChange`, `handleFilterBlur`, `clearFilter` functions
5. Add import: `import { LayerFilter } from "./LayerFilter"`
6. Replace the filter `TextInput` block (the `{!isFilterable ? null : (...)}` section) with:

```tsx
{!isFilterable ? null : (
    <LayerFilter
        layerId={layerId}
        filterExpression={layer.filterExpression}
        filterError={filterError}
    />
)}
```

- [ ] **Step 3: Format and verify**

Run: `npm run format && npm run lint && npm test`

- [ ] **Step 4: Commit**

```bash
git add src/components/LayerPanel/LayerFilter.tsx src/components/LayerPanel/index.tsx
git commit -m "extract LayerFilter from LayerPanel"
```

---

### Task 2: Extract PointControls

**Files:**
- Create: `src/components/LayerPanel/PointControls.tsx`
- Modify: `src/components/LayerPanel/index.tsx`

- [ ] **Step 1: Create PointControls component**

Create `src/components/LayerPanel/PointControls.tsx`:

```tsx
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { Badge, ColorPicker, Input, Slider } from "@mantine/core"
import { type FC } from "react"

type PointControlsProps = {
    layerId: string
    color: string
    circleRange: [number, number]
}

export const PointControls: FC<PointControlsProps> = ({ layerId, color, circleRange }) => {
    const dispatch = useAppDispatch()

    return (
        <>
            <Input.Wrapper
                label={
                    <>
                        Color
                        <Badge ml={"xs"} size="xs" radius={"sm"}>
                            {color}
                        </Badge>
                    </>
                }
                size="xs"
            >
                <ColorPicker
                    format="hex"
                    size="xs"
                    value={color}
                    styles={theme => ({
                        wrapper: {
                            width: "100%",
                        },
                        saturation: {
                            height: 130,
                        },
                        slider: {
                            marginTop: theme.spacing.sm,
                        },
                    })}
                    onChange={color => {
                        dispatch(actions.layer.setColor({ id: layerId, color }))
                    }}
                />
            </Input.Wrapper>
            <Input.Wrapper label="Radius" size="xs">
                <Slider
                    size={"xs"}
                    min={1}
                    max={10}
                    value={circleRange[1]}
                    onChange={max => {
                        dispatch(
                            actions.layer.setCircleRadius({
                                id: layerId,
                                min: 0,
                                max,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
        </>
    )
}
```

- [ ] **Step 2: Replace Point section in index.tsx**

In `src/components/LayerPanel/index.tsx`:

1. Add import: `import { PointControls } from "./PointControls"`
2. Remove the Point radius block (`{!(type === LayerType.Point) ? null : (...)}`)
3. The color picker block will be removed later when all type controls are extracted

- [ ] **Step 3: Format and verify**

Run: `npm run format && npm run lint && npm test`

---

### Task 3: Extract LineControls and PolygonControls

**Files:**
- Create: `src/components/LayerPanel/LineControls.tsx`
- Create: `src/components/LayerPanel/PolygonControls.tsx`
- Modify: `src/components/LayerPanel/index.tsx`

- [ ] **Step 1: Create LineControls component**

Create `src/components/LayerPanel/LineControls.tsx`:

```tsx
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { Badge, ColorPicker, Input } from "@mantine/core"
import { type FC } from "react"

type LineControlsProps = {
    layerId: string
    color: string
}

export const LineControls: FC<LineControlsProps> = ({ layerId, color }) => {
    const dispatch = useAppDispatch()

    return (
        <Input.Wrapper
            label={
                <>
                    Color
                    <Badge ml={"xs"} size="xs" radius={"sm"}>
                        {color}
                    </Badge>
                </>
            }
            size="xs"
        >
            <ColorPicker
                format="hex"
                size="xs"
                value={color}
                styles={theme => ({
                    wrapper: {
                        width: "100%",
                    },
                    saturation: {
                        height: 130,
                    },
                    slider: {
                        marginTop: theme.spacing.sm,
                    },
                })}
                onChange={color => {
                    dispatch(actions.layer.setColor({ id: layerId, color }))
                }}
            />
        </Input.Wrapper>
    )
}
```

- [ ] **Step 2: Create PolygonControls component**

Create `src/components/LayerPanel/PolygonControls.tsx` — identical structure to `LineControls.tsx`:

```tsx
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { Badge, ColorPicker, Input } from "@mantine/core"
import { type FC } from "react"

type PolygonControlsProps = {
    layerId: string
    color: string
}

export const PolygonControls: FC<PolygonControlsProps> = ({ layerId, color }) => {
    const dispatch = useAppDispatch()

    return (
        <Input.Wrapper
            label={
                <>
                    Color
                    <Badge ml={"xs"} size="xs" radius={"sm"}>
                        {color}
                    </Badge>
                </>
            }
            size="xs"
        >
            <ColorPicker
                format="hex"
                size="xs"
                value={color}
                styles={theme => ({
                    wrapper: {
                        width: "100%",
                    },
                    saturation: {
                        height: 130,
                    },
                    slider: {
                        marginTop: theme.spacing.sm,
                    },
                })}
                onChange={color => {
                    dispatch(actions.layer.setColor({ id: layerId, color }))
                }}
            />
        </Input.Wrapper>
    )
}
```

- [ ] **Step 3: Add imports in index.tsx**

```tsx
import { LineControls } from "./LineControls"
import { PolygonControls } from "./PolygonControls"
```

- [ ] **Step 4: Format and verify**

Run: `npm run format && npm run lint && npm test`

- [ ] **Step 5: Commit Tasks 2–3**

```bash
git add src/components/LayerPanel/PointControls.tsx src/components/LayerPanel/LineControls.tsx src/components/LayerPanel/PolygonControls.tsx src/components/LayerPanel/index.tsx
git commit -m "extract Point, Line, Polygon controls from LayerPanel"
```

---

### Task 4: Extract HeatmapControls

**Files:**
- Create: `src/components/LayerPanel/HeatmapControls.tsx`
- Modify: `src/components/LayerPanel/index.tsx`

- [ ] **Step 1: Create HeatmapControls component**

Create `src/components/LayerPanel/HeatmapControls.tsx`:

```tsx
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { Input, Slider } from "@mantine/core"
import { type FC } from "react"

type HeatmapControlsProps = {
    layerId: string
    heatmapRadius: number
    heatmapIntensity: number
}

export const HeatmapControls: FC<HeatmapControlsProps> = ({ layerId, heatmapRadius, heatmapIntensity }) => {
    const dispatch = useAppDispatch()

    return (
        <>
            <Input.Wrapper label="Radius" size="xs">
                <Slider
                    label={"Radius"}
                    size={"xs"}
                    min={2}
                    max={30}
                    value={heatmapRadius}
                    onChange={value => {
                        dispatch(
                            actions.layer.setHeatmapParameters({
                                id: layerId,
                                radius: value,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
            <Input.Wrapper label="Intensity" size="xs">
                <Slider
                    label={"Intensity"}
                    size={"xs"}
                    min={1}
                    max={5}
                    value={heatmapIntensity}
                    onChange={value => {
                        dispatch(
                            actions.layer.setHeatmapParameters({
                                id: layerId,
                                intensity: value,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
        </>
    )
}
```

- [ ] **Step 2: Replace Heatmap section in index.tsx**

1. Add import: `import { HeatmapControls } from "./HeatmapControls"`
2. Remove the heatmap block (`{!(type === LayerType.Heatmap) ? null : (...)}`)

- [ ] **Step 3: Format and verify**

Run: `npm run format && npm run lint && npm test`

- [ ] **Step 4: Commit**

```bash
git add src/components/LayerPanel/HeatmapControls.tsx src/components/LayerPanel/index.tsx
git commit -m "extract HeatmapControls from LayerPanel"
```

---

### Task 5: Extract PhotoControls

**Files:**
- Create: `src/components/LayerPanel/PhotoControls.tsx`
- Modify: `src/components/LayerPanel/index.tsx`

- [ ] **Step 1: Create PhotoControls component**

Create `src/components/LayerPanel/PhotoControls.tsx`:

```tsx
import { actions } from "@/store"
import type { PhotoIconLayout } from "@/store/layer"
import { useAppDispatch } from "@/store/hooks"
import { Input, Select, Slider } from "@mantine/core"
import { type FC } from "react"

type PhotoControlsProps = {
    layerId: string
    clusterRadius: number
    srcField: string | undefined
    valueField: string | undefined
    icon: PhotoIconLayout | undefined
    fields: string[]
}

export const PhotoControls: FC<PhotoControlsProps> = ({
    layerId,
    clusterRadius,
    srcField,
    valueField,
    icon,
    fields,
}) => {
    const dispatch = useAppDispatch()

    return (
        <>
            <Input.Wrapper label="Radius" size="xs">
                <Slider
                    label={"Radius"}
                    size={"xs"}
                    min={50}
                    max={200}
                    value={clusterRadius}
                    onChange={value => {
                        dispatch(
                            actions.layer.setPhotoClusterRadius({
                                id: layerId,
                                value,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
            <Select
                size="xs"
                label="Image field"
                placeholder="Pick one"
                value={srcField}
                data={fields}
                onChange={src => {
                    if (src) {
                        dispatch(
                            actions.layer.setPhotoField({
                                id: layerId,
                                src,
                            }),
                        )
                    }
                }}
            />
            <Select
                size="xs"
                label="Value field"
                placeholder="Pick one"
                value={valueField}
                data={fields}
                onChange={value => {
                    if (value) {
                        dispatch(
                            actions.layer.setPhotoField({
                                id: layerId,
                                value,
                            }),
                        )
                    }
                }}
            />
            <Select
                size="xs"
                label="Layout"
                placeholder="Pick one"
                value={icon}
                data={[
                    { value: "square", label: "Square" },
                    { value: "circle", label: "Circle" },
                ]}
                onChange={(value: PhotoIconLayout) => {
                    if (value) {
                        dispatch(
                            actions.layer.setPhotoIconLayout({
                                id: layerId,
                                value,
                            }),
                        )
                    }
                }}
            />
        </>
    )
}
```

- [ ] **Step 2: Replace Photo section in index.tsx**

1. Add import: `import { PhotoControls } from "./PhotoControls"`
2. Remove the photo block (`{!(type === LayerType.Photo) ? null : (...)}`)
3. Remove `PhotoIconLayout` import from index.tsx (no longer used there)

- [ ] **Step 3: Format and verify**

Run: `npm run format && npm run lint && npm test`

- [ ] **Step 4: Commit**

```bash
git add src/components/LayerPanel/PhotoControls.tsx src/components/LayerPanel/index.tsx
git commit -m "extract PhotoControls from LayerPanel"
```

---

### Task 6: Extract ExtrusionControls

**Files:**
- Create: `src/components/LayerPanel/ExtrusionControls.tsx`
- Modify: `src/components/LayerPanel/index.tsx`

- [ ] **Step 1: Create ExtrusionControls component**

Create `src/components/LayerPanel/ExtrusionControls.tsx`:

```tsx
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { Badge, ColorPicker, Input, Select, Slider } from "@mantine/core"
import { type FC } from "react"

type ExtrusionControlsProps = {
    layerId: string
    color: string
    extrusionHeight: number
    extrusionHeightField: string | undefined
    extrusionBase: number
    extrusionBaseField: string | undefined
    fields: string[]
}

export const ExtrusionControls: FC<ExtrusionControlsProps> = ({
    layerId,
    color,
    extrusionHeight,
    extrusionHeightField,
    extrusionBase,
    extrusionBaseField,
    fields,
}) => {
    const dispatch = useAppDispatch()

    return (
        <>
            <Input.Wrapper
                label={
                    <>
                        Color
                        <Badge ml={"xs"} size="xs" radius={"sm"}>
                            {color}
                        </Badge>
                    </>
                }
                size="xs"
            >
                <ColorPicker
                    format="hex"
                    size="xs"
                    value={color}
                    styles={theme => ({
                        wrapper: {
                            width: "100%",
                        },
                        saturation: {
                            height: 130,
                        },
                        slider: {
                            marginTop: theme.spacing.sm,
                        },
                    })}
                    onChange={color => {
                        dispatch(actions.layer.setColor({ id: layerId, color }))
                    }}
                />
            </Input.Wrapper>
            <Input.Wrapper label="Height" size="xs">
                <Slider
                    label={"Height"}
                    size={"xs"}
                    min={0}
                    max={10}
                    value={extrusionHeight}
                    onChange={value => {
                        dispatch(
                            actions.layer.setExtrusionOptions({
                                id: layerId,
                                height: value,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
            <Select
                searchable
                size="xs"
                label="Height field"
                placeholder="Pick one"
                value={extrusionHeightField}
                data={fields}
                onChange={value => {
                    if (value) {
                        dispatch(
                            actions.layer.setExtrusionOptions({
                                id: layerId,
                                heightField: value,
                            }),
                        )
                    }
                }}
            />
            <Input.Wrapper label="Base" size="xs">
                <Slider
                    label={"Base"}
                    size={"xs"}
                    min={0}
                    max={10}
                    value={extrusionBase}
                    onChange={value => {
                        dispatch(
                            actions.layer.setExtrusionOptions({
                                id: layerId,
                                base: value,
                            }),
                        )
                    }}
                />
            </Input.Wrapper>
            <Select
                searchable
                size="xs"
                label="Base field"
                placeholder="Pick one"
                value={extrusionBaseField}
                data={fields}
                onChange={value => {
                    if (value) {
                        dispatch(
                            actions.layer.setExtrusionOptions({
                                id: layerId,
                                baseField: value,
                            }),
                        )
                    }
                }}
            />
        </>
    )
}
```

- [ ] **Step 2: Replace Extrusion section in index.tsx**

1. Add import: `import { ExtrusionControls } from "./ExtrusionControls"`
2. Remove the extrusion block (`{!(type === LayerType.Extrusion) ? null : (...)}`)

- [ ] **Step 3: Format and verify**

Run: `npm run format && npm run lint && npm test`

- [ ] **Step 4: Commit**

```bash
git add src/components/LayerPanel/ExtrusionControls.tsx src/components/LayerPanel/index.tsx
git commit -m "extract ExtrusionControls from LayerPanel"
```

---

### Task 7: Replace color/type-specific blocks with unified switch

**Files:**
- Modify: `src/components/LayerPanel/index.tsx`

- [ ] **Step 1: Replace all remaining type-specific JSX with a switch helper**

Remove the color picker block (`{!(type === LayerType.Point || ...) ? null : (...)}`) and all individual type blocks. Replace with a single section that renders the correct controls component:

```tsx
{type === LayerType.Point ? (
    <PointControls layerId={layerId} color={color} circleRange={circleRange} />
) : type === LayerType.Line ? (
    <LineControls layerId={layerId} color={color} />
) : type === LayerType.Polygon ? (
    <PolygonControls layerId={layerId} color={color} />
) : type === LayerType.Heatmap ? (
    <HeatmapControls
        layerId={layerId}
        heatmapRadius={heatmapRadius}
        heatmapIntensity={heatmapIntensity}
    />
) : type === LayerType.Photo ? (
    <PhotoControls
        layerId={layerId}
        clusterRadius={clusterRadius}
        srcField={layer.srcField}
        valueField={layer.valueField}
        icon={layer.icon}
        fields={layer.fields}
    />
) : type === LayerType.Extrusion ? (
    <ExtrusionControls
        layerId={layerId}
        color={color}
        extrusionHeight={layer.extrusionHeight}
        extrusionHeightField={layer.extrusionHeightField}
        extrusionBase={layer.extrusionBase}
        extrusionBaseField={layer.extrusionBaseField}
        fields={layer.fields}
    />
) : null}
```

- [ ] **Step 2: Clean up unused imports in index.tsx**

Remove any imports that are no longer used after extraction:
- `ColorPicker`, `Slider`, `Badge`, `Input` (if not used by remaining code — `Input` may still be used, check)
- `PhotoIconLayout` type
- `useState`, `useEffect` (moved to LayerFilter)
- `IconX` (moved to LayerFilter)

Keep: `ActionIcon`, `Flex`, `Select`, `TextInput`, and all other imports still used by the common controls.

- [ ] **Step 3: Format and verify**

Run: `npm run format && npm run lint && npm test`

- [ ] **Step 4: Commit**

```bash
git add src/components/LayerPanel/index.tsx
git commit -m "wire up extracted controls in LayerPanel"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full check**

Run: `npm run format && npm run lint && npm test`
Expected: all pass, no warnings

- [ ] **Step 2: Verify line count reduction**

Run: `wc -l src/components/LayerPanel/index.tsx`
Expected: ~230–260 lines (down from 593)

- [ ] **Step 3: Verify all new files exist**

Run: `ls src/components/LayerPanel/`
Expected files:
- `index.tsx`
- `index.test.ts`
- `LayerFilter.tsx`
- `PointControls.tsx`
- `LineControls.tsx`
- `PolygonControls.tsx`
- `HeatmapControls.tsx`
- `PhotoControls.tsx`
- `ExtrusionControls.tsx`
