# Add ErrorBoundary to prevent full app crashes (#84)

## Context

The app has no ErrorBoundary. Any React rendering error causes a full white-screen crash with no recovery. This is risky because the app loads user-provided geospatial data that could trigger unexpected rendering errors.

## Approach

Use the `react-error-boundary` library (no class component boilerplate needed). Create a thin fallback UI component with Mantine styling and wrap three key subtrees.

## Step 1: Install dependency

```bash
npm install react-error-boundary
```

## Step 2: Create fallback UI component

**New file: `src/ui/ErrorFallback/index.tsx`**

A functional component using Mantine's `createStyles`, `Stack`, `Text`, `Button`. Receives `FallbackProps` from the library (`error`, `resetErrorBoundary`).

Two props control appearance:
- `variant: "fullscreen" | "sidebar"` — layout variant
- `onReload` — optional callback for "Reload App" button

| Variant      | Used for    | Layout                                     |
|------------- |------------ |------------------------------------------- |
| `fullscreen` | SphereMap   | Centered message filling the content area   |
| `sidebar`    | LeftSidebar | Compact message in narrow panel             |

Contains two buttons:
- **Try Again** — calls `resetErrorBoundary()` (retries render, preserves Redux state)
- **Reload App** — calls `window.location.reload()`

## Step 3: Create root-level fallback

**New file: `src/ui/ErrorFallback/RootErrorFallback.tsx`**

Minimal fallback using **inline styles only** (no Mantine) — this wraps outside the theme provider so Mantine hooks are unavailable.

## Step 4: Wrap SphereMap and LeftSidebar

**Modified file: `src/components/App/index.tsx`**

```tsx
import { ErrorBoundary } from "react-error-boundary"
import { ErrorFallback } from "@/ui/ErrorFallback"

// line 54: wrap LeftSidebar
<ErrorBoundary
    fallbackRender={(props) => <ErrorFallback {...props} variant="sidebar" />}
    onError={(error, info) => logger.error("LeftSidebar crashed: %s", error.message)}
>
    <LeftSidebar />
</ErrorBoundary>

// lines 58-60: wrap SphereMap
<ErrorBoundary
    fallbackRender={(props) => <ErrorFallback {...props} variant="fullscreen" />}
    onError={(error, info) => logger.error("SphereMap crashed: %s", error.message)}
>
    <SphereMap id={id} />
</ErrorBoundary>
```

## Step 5: Wrap root App

**Modified file: `src/main.tsx`**

```tsx
import { ErrorBoundary } from "react-error-boundary"
import { RootErrorFallback } from "@/ui/ErrorFallback/RootErrorFallback"

<React.StrictMode>
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
        <Provider store={store}>
            <SphereThemeProvider>
                <App />
            </SphereThemeProvider>
        </Provider>
    </ErrorBoundary>
</React.StrictMode>
```

## Files summary

| File                                     | Action   |
|----------------------------------------- |--------- |
| `src/ui/ErrorFallback/index.tsx`         | Create   |
| `src/ui/ErrorFallback/RootErrorFallback.tsx` | Create   |
| `src/components/App/index.tsx`           | Modify   |
| `src/main.tsx`                           | Modify   |

## Verification

1. `npm run build` — no type or lint errors
2. `npm test` — existing tests pass
3. Manual: temporarily add `throw new Error("test")` inside SphereMap / LeftSidebar / App to verify each boundary catches errors independently and shows the correct fallback
