# npm monorepo Implementation Plan (issue-218)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the sphere frontend into an npm-workspaces monorepo with two extracted packages (`@sphere/utils`, `@sphere/ui`) and the Tauri app relocated under `apps/sphere/`, without breaking the Tauri build.

**Architecture:** Five sequential commits, each leaving the app buildable. Workspace packages are consumed as raw TypeScript (no build step) via npm workspace symlinks. TS path aliases + Biome `noRestrictedImports` enforce the `app -> ui -> utils` dependency direction.

**Tech Stack:** Node 22, npm workspaces, TypeScript 5.8, Vite 8, Vitest 4, Biome 1.9, Tauri 2.9 (unchanged), MapLibre GL 5, Mantine 5, React 18.

**Spec:** `docs/specs/issue-218.md`

---

## Pre-flight checklist (run once before Task 1)

Run these commands to confirm the starting state is green. If any fails, fix the underlying issue before starting the plan.

```bash
cd /Users/tmshv/Workspace/__github_tmshv/sphere
git status                   # expect: clean working tree (or known scratch files)
node --version               # expect: v22.x
npm --version                # expect: 10.x
npm run typecheck            # expect: exit 0
npm run test                 # expect: all tests pass
npm run lint                 # expect: exit 0
```

Create a new branch for the work:

```bash
git checkout -b issue-218
```

---

## File structure (what changes, at a glance)

**Created (new files):**
- `tsconfig.base.json` — shared TS config at repo root
- `apps/sphere/package.json` — app workspace manifest
- `apps/sphere/tsconfig.json` — app TS config (replaces root `tsconfig.json`)
- `apps/sphere/vite.config.ts` — app Vite config (moved from root)
- `apps/sphere/vitest.config.ts` — app Vitest config (split from `vite.config.ts`)
- `packages/utils/package.json`
- `packages/utils/tsconfig.json`
- `packages/utils/biome.json`
- `packages/utils/vitest.config.ts`
- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `packages/ui/biome.json`
- `packages/ui/vitest.config.ts`

**Moved (path-only changes):**
- `src/**` -> `apps/sphere/src/**` (Task 2)
- `index.html`, `properties.html`, `public/` -> `apps/sphere/` (Task 2)
- `apps/sphere/src/lib/{array,math,once,path,stat,time,predict-data-type,color-scheme}.{ts,test.ts}` -> `packages/utils/src/` (Task 3; `color-scheme.ts` has no test)
- `apps/sphere/src/ui/*` -> `packages/ui/src/*` (Task 4)
- `apps/sphere/src/test-utils.tsx` -> `packages/ui/src/test-utils.tsx` (Task 4)

**Modified:**
- Root `package.json` — becomes a versionless workspace root; scripts delegate via `-w @sphere/app` (Tasks 1–2)
- `src-tauri/tauri.conf.json` — `frontendDist` repath only (Task 2)
- `scripts/version.js` — three path literals updated to resolve from `apps/sphere/` CWD (Task 2)
- `apps/sphere/src/store/listeners/add-blank-layer.ts` — import rewrite (Task 3)
- `apps/sphere/src/lib/tauri.ts` — import rewrite (`@/lib/once` -> `@sphere/utils/once`) (Task 3)
- `apps/sphere/src/hooks/useFeatureProperties.ts` — import rewrite (Task 3)
- `packages/ui/src/PropertiesViewer/index.tsx` — import rewrite (Task 3, cross-package)
- Every file under `apps/sphere/src/components/**` that imports `@/ui/*` — import rewrite (Task 4)
- `apps/sphere/src/main.tsx` — import rewrite for `@/ui/ErrorFallback/RootErrorFallback` (Task 4)
- All `*.test.tsx` under `apps/sphere/src/components/**` and `packages/ui/src/**` that use `@/test-utils` — import rewrite (Task 4)
- Root `CLAUDE.md` — new "Frontend layering" section (Task 5)

**Deleted:**
- Root `tsconfig.json` (replaced by `tsconfig.base.json` + `apps/sphere/tsconfig.json`) (Task 2)
- Root `vite.config.ts` (moved under `apps/sphere/`) (Task 2)

**Untouched:**
- `crates/`, `src-tauri/src/`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`
- `samples/`, `docs/`, `README.md`, `mise.toml`

---

## Task 1: Workspace skeleton

**Goal:** Create the directory layout, `tsconfig.base.json`, and declare `workspaces` in the root `package.json`. The app still lives at the repo root — no file moves yet. After this commit, `npm run tauri dev` must still run exactly as before.

**Files:**
- Create: `tsconfig.base.json`
- Create: `apps/.gitkeep`
- Create: `packages/ui/.gitkeep`
- Create: `packages/utils/.gitkeep`
- Modify: `package.json` (add `workspaces` field only)

### Steps

- [x] **Step 1.1: Create the skeleton directories and placeholders**

```bash
cd /Users/tmshv/Workspace/__github_tmshv/sphere
mkdir -p apps packages/ui packages/utils
touch apps/.gitkeep packages/ui/.gitkeep packages/utils/.gitkeep
```

- [x] **Step 1.2: Create `tsconfig.base.json` at repo root**

Write the following file exactly as shown:

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "lib": ["DOM", "DOM.Iterable", "ESNext"],
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "jsx": "react-jsx",
        "strict": true,
        "useDefineForClassFields": true,
        "skipLibCheck": true,
        "esModuleInterop": false,
        "allowSyntheticDefaultImports": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "allowJs": false,
        "noEmit": true,
        "types": ["vitest/globals"],
        "baseUrl": ".",
        "paths": {
            "@sphere/utils/*": ["./packages/utils/src/*"],
            "@sphere/ui":      ["./packages/ui/src"],
            "@sphere/ui/*":    ["./packages/ui/src/*"]
        }
    }
}
```

Note: `baseUrl: "."` makes `paths` resolve relative to the file that *defines* them, which is the repo root here. Packages/app that `extend` this file will still work because TS resolves extended `paths` against the defining file unless a child config overrides the `paths` field.

- [x] **Step 1.3: Add `workspaces` to root `package.json`**

Open `package.json` and add the `workspaces` field immediately after `"type": "module"`:

```json
{
    "name": "sphere",
    "private": true,
    "version": "0.16.3",
    "type": "module",
    "workspaces": ["apps/*", "packages/*"],
    "scripts": {
```

Do NOT change anything else in `package.json` during Task 1. All deps stay at the root for now.

- [x] **Step 1.4: Reinstall with workspaces enabled**

```bash
rm -rf node_modules package-lock.json
npm install
```

Expected: exit 0, `node_modules/` repopulated, a new `package-lock.json` is generated with the workspace layout but no workspace packages yet (the glob matches nothing).

- [x] **Step 1.5: Verify the app still runs**

```bash
npm run typecheck
npm run test
npm run lint
```

Expected: all three pass with the same results as the pre-flight.

```bash
npm run tauri dev
```

Expected: app window opens, map renders, no red errors in the terminal or dev console. Close the window with Cmd+Q.

- [x] **Step 1.6: Commit**

```bash
git add tsconfig.base.json apps packages package.json package-lock.json
git commit -m "Add npm workspaces skeleton for monorepo migration"
```

---

## Task 2: Relocate the app into `apps/sphere/`

**Goal:** Move every frontend file from the repo root into `apps/sphere/`, split the root `package.json` into a slim workspace root + a full app manifest, and repath `src-tauri/tauri.conf.json`. After this commit, `npm run tauri dev` still runs from the repo root and produces an identical build, but everything lives under `apps/sphere/`.

**Files:**
- Move: `src/` -> `apps/sphere/src/`
- Move: `index.html` -> `apps/sphere/index.html`
- Move: `properties.html` -> `apps/sphere/properties.html`
- Move: `public/` -> `apps/sphere/public/`
- Move: `assets/` -> `apps/sphere/assets/` (referenced by `index.html`/`properties.html`)
- Create: `apps/sphere/package.json`
- Create: `apps/sphere/tsconfig.json`
- Create: `apps/sphere/vite.config.ts`
- Create: `apps/sphere/vitest.config.ts`
- Delete: root `tsconfig.json`
- Delete: root `vite.config.ts`
- Modify: root `package.json` (slim down)
- Modify: `src-tauri/tauri.conf.json` (`frontendDist` only)
- Modify: `scripts/version.js` (three path literals)
- Modify: `.gitignore` if it references root `dist/`

### Steps

- [x] **Step 2.1: Verify nothing is running**

```bash
cd /Users/tmshv/Workspace/__github_tmshv/sphere
lsof -i :1420 || echo "port 1420 free"
```

Expected: `port 1420 free`. If a dev server is running, close it before proceeding.

- [x] **Step 2.2: Move the frontend files into `apps/sphere/`**

```bash
git mv src apps/sphere/src
git mv index.html apps/sphere/index.html
git mv properties.html apps/sphere/properties.html
git mv public apps/sphere/public
git mv assets apps/sphere/assets
rm -rf dist
```

Check what remains at the repo root that relates to the frontend:

```bash
ls
```

You should still see at the root: `apps/`, `packages/`, `crates/`, `src-tauri/`, `docs/`, `scripts/`, `samples/`, `node_modules/`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `biome.json`, `tsconfig.base.json`, `README.md`, `CLAUDE.md`, `mise.toml`, `sphere.png`, `app-icon.png`, `app-icon.pxd`, `.gitignore`. The files `tsconfig.json` and `vite.config.ts` are still at the root — they move next.

- [x] **Step 2.3: Move `vite.config.ts` to `apps/sphere/` and drop its `test` block**

```bash
git mv vite.config.ts apps/sphere/vite.config.ts
```

Open `apps/sphere/vite.config.ts` and remove the entire `test: { ... }` block — it moves to a separate `vitest.config.ts` in Step 2.4. Also delete the `/// <reference types="vitest" />` triple-slash line at the top of the file since Vitest types are no longer needed here. Everything else stays verbatim.

The final `apps/sphere/vite.config.ts` must look like this:

```ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

const host = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
    plugins: [react()],

    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: "ws",
                host,
                port: 1421,
            }
            : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
    envPrefix: ["VITE_", "TAURI_"],
    build: {
        target: ["es2022", "safari15"],
        minify: !process.env.TAURI_DEBUG ? true : false,
        sourcemap: !!process.env.TAURI_DEBUG,
        chunkSizeWarningLimit: 2048,
        rolldownOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                properties: resolve(__dirname, "properties.html"),
            },
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: "main",
                            test: /./,
                            minSize: 0,
                            priority: 0,
                        },
                        {
                            name: "properties",
                            test: /properties/,
                            minSize: 0,
                            priority: 1,
                        },
                    ],
                },
            },
        },
    },
})
```

- [x] **Step 2.4: Create `apps/sphere/vitest.config.ts`**

Write the following new file:

```ts
/// <reference types="vitest" />
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
    plugins: [react()],
    test: {
        include: [
            "**/*.test.ts",
            "**/*.test.tsx",
        ],
        exclude: [
            "**/node_modules/**",
            "**/.worktrees/**",
        ],
        globals: true,
        environment: "happy-dom",
        setupFiles: ["./src/setupTests.ts"],
        coverage: {
            provider: "v8",
            thresholds: {
                lines: 50,
                functions: 50,
                branches: 40,
            },
        },
    },
})
```

- [x] **Step 2.5: Move `tsconfig.json` to `apps/sphere/` and rewrite its contents**

```bash
git mv tsconfig.json apps/sphere/tsconfig.json
```

Overwrite `apps/sphere/tsconfig.json` with:

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*":             ["./src/*"],
            "@sphere/utils/*": ["../../packages/utils/src/*"],
            "@sphere/ui":      ["../../packages/ui/src"],
            "@sphere/ui/*":    ["../../packages/ui/src/*"]
        }
    },
    "include": ["src"]
}
```

Reason for re-declaring `@sphere/*` paths: TypeScript resolves `paths` relative to the `tsconfig.json` that defines them. When a child config overrides `paths`, the whole map is replaced, so we must restate the package aliases with the correct relative prefix.

- [x] **Step 2.6: Create `apps/sphere/package.json`**

Write the following new file:

```json
{
    "name": "@sphere/app",
    "private": true,
    "version": "0.16.3",
    "type": "module",
    "scripts": {
        "version": "node ../../scripts/version.js && git add ../../src-tauri/tauri.conf.json ../../src-tauri/Cargo.toml ../../src-tauri/Cargo.lock",
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview",
        "lint": "biome lint src/",
        "lint:fix": "biome lint --write src/",
        "format": "biome format --write src/",
        "format:check": "biome format src/",
        "typecheck": "tsc --noEmit",
        "test": "vitest run",
        "test:watch": "vitest watch",
        "coverage": "vitest run --coverage",
        "tauri": "tauri"
    },
    "dependencies": {
        "@emotion/react": "^11.14.0",
        "@hyvilo/maplibre-gl-draw": "^1.0.0",
        "@mantine/core": "^5.10.5",
        "@mantine/form": "^5.10.5",
        "@mantine/hooks": "^5.10.5",
        "@mantine/spotlight": "^5.10.5",
        "@maplibre/maplibre-gl-style-spec": "^24.7.0",
        "@reduxjs/toolkit": "^2.8.0",
        "@tabler/icons": "^1.119.0",
        "@tanstack/react-table": "^8.21.0",
        "@tauri-apps/api": "^2.6.0",
        "@tauri-apps/plugin-clipboard-manager": "^2.3.0",
        "@tauri-apps/plugin-dialog": "^2.3.0",
        "@tauri-apps/plugin-fs": "^2.4.0",
        "@tauri-apps/plugin-http": "^2.5.0",
        "@tauri-apps/plugin-shell": "^2.3.0",
        "@turf/helpers": "^7.2.0",
        "@turf/turf": "^7.2.0",
        "@visx/group": "^3.12.0",
        "@visx/scale": "^3.12.0",
        "@visx/shape": "^3.12.0",
        "date-fns": "^4.1.0",
        "maplibre-gl": "^5.22.0",
        "pino": "^10.0.0",
        "react": "^18.3.0",
        "react-dnd": "^16.0.1",
        "react-dnd-html5-backend": "^16.0.1",
        "react-dom": "^18.3.0",
        "react-error-boundary": "^6.1.1",
        "react-map-gl": "^8.0.0",
        "react-redux": "^9.2.0",
        "supercluster": "^8.0.1"
    },
    "devDependencies": {
        "@tauri-apps/cli": "^2.6.0",
        "@types/supercluster": "^7.1.0"
    }
}
```

Note: `@tauri-apps/cli` stays in the app's devDeps because `npm run tauri` is invoked from this workspace. `@types/supercluster` is tied to the `supercluster` dep in this app, so keep it here. Every other dev tool (biome, testing, vitest, typescript, vite) is hoistable and stays at the root in Step 2.8.

- [x] **Step 2.7: Update `src-tauri/tauri.conf.json`**

Change exactly one line — `frontendDist`:

```json
"frontendDist": "../apps/sphere/dist"
```

Leave `beforeDevCommand`, `beforeBuildCommand`, and `devUrl` unchanged.

- [x] **Step 2.8: Rewrite root `package.json`**

Replace the root `package.json` with a slim workspace root. Remove the `version` field entirely. Remove every runtime dep. Keep only hoistable dev tooling:

```json
{
    "name": "sphere-monorepo",
    "private": true,
    "type": "module",
    "workspaces": ["apps/*", "packages/*"],
    "scripts": {
        "dev": "npm run dev -w @sphere/app",
        "build": "npm run build -w @sphere/app",
        "preview": "npm run preview -w @sphere/app",
        "tauri": "npm run tauri -w @sphere/app",
        "lint": "biome lint .",
        "lint:fix": "biome lint --write .",
        "format": "biome format --write .",
        "format:check": "biome format .",
        "typecheck": "npm run typecheck --workspaces --if-present",
        "test": "npm run test --workspaces --if-present",
        "test:watch": "npm run test:watch -w @sphere/app",
        "coverage": "npm run coverage -w @sphere/app"
    },
    "devDependencies": {
        "@biomejs/biome": "^1.9.0",
        "@testing-library/dom": "^10.4.1",
        "@testing-library/jest-dom": "^6.9.1",
        "@testing-library/react": "^16.3.2",
        "@testing-library/user-event": "^14.6.1",
        "@types/node": "^22.15.0",
        "@types/react": "^18.3.0",
        "@types/react-dom": "^18.3.0",
        "@vitejs/plugin-react": "^6.0.1",
        "@vitest/coverage-v8": "^4.1.0",
        "happy-dom": "^20.7.0",
        "typescript": "^5.8.3",
        "vite": "^8.0.1",
        "vitest": "^4.1.0"
    }
}
```

- [x] **Step 2.9: Update `scripts/version.js`**

The script currently reads `src-tauri/tauri.conf.json` as a relative path (relative to CWD). After the move, `npm version patch -w @sphere/app` runs the script with CWD = `apps/sphere/`. Three string literals inside `scripts/version.js` need updating — do not rewrite the whole file, only edit these three literals in place:

1. The `tauriConfigPath` constant: change `"src-tauri/tauri.conf.json"` to `"../../src-tauri/tauri.conf.json"`.
2. The `cargoPath` constant: change `"src-tauri/Cargo.toml"` to `"../../src-tauri/Cargo.toml"`.
3. Inside the `cargo update --workspace --manifest-path …` command string: change `src-tauri/Cargo.toml` to `../../src-tauri/Cargo.toml`.

No other changes to the file. The existing logic (reading `process.env.npm_package_version`, invoking `cargo update` via `execSync`) is preserved.

- [x] **Step 2.10: Check `.gitignore`**

```bash
grep -n "^dist" .gitignore
```

If `dist` is ignored at the repo root, also ignore `apps/*/dist`:

```bash
printf "\napps/*/dist\n" >> .gitignore
```

- [x] **Step 2.11: Reinstall**

```bash
rm -rf node_modules package-lock.json apps/sphere/node_modules
npm install
```

Expected: exit 0. `@sphere/app` appears as a workspace in the install output. `node_modules/@sphere/app` is a symlink to `apps/sphere/`.

```bash
ls -la node_modules/@sphere/
```

Expected: one symlink `app -> ../../apps/sphere`.

- [x] **Step 2.12: Typecheck + test + lint**

```bash
npm run typecheck
```

Expected: exit 0. If TS can't resolve `@/…` imports, verify `apps/sphere/tsconfig.json` has `"baseUrl": "."` and `include: ["src"]`.

```bash
npm run test
```

Expected: same test count as before the move, all green.

```bash
npm run lint
```

Expected: exit 0.

- [x] **Step 2.13: Full Tauri dev smoke test** (skipped - manual GUI test)

```bash
npm run tauri dev
```

Expected behavior to verify in the opened window:
1. Main window opens within ~10 s.
2. The map renders with default tiles.
3. Open DevTools (right-click → Inspect in the Tauri window, or `Cmd+Opt+I`). Console must be free of red errors. You may see a Redux devtools warning; that's fine.
4. Open any `.geojson` or `.shp` sample from `samples/` via the file menu. The layer must appear and render.
5. Toggle the left sidebar; click through Sources and Layers tabs. They must render.
6. Close the window with `Cmd+Q`.

If any step fails, do NOT proceed. Debug first.

- [x] **Step 2.14: Tauri production build smoke test** (skipped - manual build test)

```bash
npm run tauri build
```

Expected: build completes, and `src-tauri/target/release/bundle/macos/Sphere.app` (or similar, per platform) is produced. Size is non-trivial (> 50 MB on macOS). Skip actually launching the bundle — we just need to confirm `frontendDist` resolved correctly.

- [x] **Step 2.15: Versioning smoke test**

```bash
npm version patch -w @sphere/app --no-git-tag-version
```

Expected: `apps/sphere/package.json` version becomes `0.16.4`. `scripts/version.js` runs and updates `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`.

Verify:

```bash
grep '"version"' src-tauri/tauri.conf.json
grep '^version' src-tauri/Cargo.toml | head -3
```

Then revert the version bump (we don't want to ship a version change in this commit):

```bash
git checkout apps/sphere/package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
```

- [x] **Step 2.16: Commit**

```bash
git add -A
git status                # review what's staged, should match the files listed in the task header
git commit -m "Relocate frontend into apps/sphere workspace"
```

---

## Task 3: Extract `@sphere/utils`

**Goal:** Move 8 pure utility files from `apps/sphere/src/lib/` into a new `@sphere/utils` package. Rewrite every consumer import. Add strict Biome `noRestrictedImports` rules to prevent the package from importing anything it shouldn't.

**Files:**
- Move: `apps/sphere/src/lib/array.ts` -> `packages/utils/src/array.ts`
- Move: `apps/sphere/src/lib/array.test.ts` -> `packages/utils/src/array.test.ts`
- Move: `apps/sphere/src/lib/math.ts` -> `packages/utils/src/math.ts`
- Move: `apps/sphere/src/lib/math.test.ts` -> `packages/utils/src/math.test.ts`
- Move: `apps/sphere/src/lib/once.ts` -> `packages/utils/src/once.ts`
- Move: `apps/sphere/src/lib/once.test.ts` -> `packages/utils/src/once.test.ts`
- Move: `apps/sphere/src/lib/path.ts` -> `packages/utils/src/path.ts`
- Move: `apps/sphere/src/lib/path.test.ts` -> `packages/utils/src/path.test.ts`
- Move: `apps/sphere/src/lib/stat.ts` -> `packages/utils/src/stat.ts`
- Move: `apps/sphere/src/lib/stat.test.ts` -> `packages/utils/src/stat.test.ts`
- Move: `apps/sphere/src/lib/time.ts` -> `packages/utils/src/time.ts`
- Move: `apps/sphere/src/lib/time.test.ts` -> `packages/utils/src/time.test.ts`
- Move: `apps/sphere/src/lib/predict-data-type.ts` -> `packages/utils/src/predict-data-type.ts`
- Move: `apps/sphere/src/lib/predict-data-type.test.ts` -> `packages/utils/src/predict-data-type.test.ts`
- Move: `apps/sphere/src/lib/color-scheme.ts` -> `packages/utils/src/color-scheme.ts` *(no test file)*
- Create: `packages/utils/package.json`
- Create: `packages/utils/tsconfig.json`
- Create: `packages/utils/biome.json`
- Create: `packages/utils/vitest.config.ts`
- Modify: `apps/sphere/src/lib/tauri.ts` (import rewrite)
- Modify: `apps/sphere/src/hooks/useFeatureProperties.ts` (import rewrite)
- Modify: `apps/sphere/src/store/listeners/add-blank-layer.ts` (import rewrite)
- Modify: `apps/sphere/src/ui/PropertiesViewer/index.tsx` (import rewrite — still under the app at this point; the file moves to the UI package in Task 4)

### Steps

- [x] **Step 3.1: Create `packages/utils/package.json`**

```json
{
    "name": "@sphere/utils",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
        "./array":             "./src/array.ts",
        "./color-scheme":      "./src/color-scheme.ts",
        "./math":              "./src/math.ts",
        "./once":              "./src/once.ts",
        "./path":              "./src/path.ts",
        "./predict-data-type": "./src/predict-data-type.ts",
        "./stat":              "./src/stat.ts",
        "./time":              "./src/time.ts"
    },
    "scripts": {
        "typecheck": "tsc --noEmit",
        "test": "vitest run"
    }
}
```

- [x] **Step 3.2: Create `packages/utils/tsconfig.json`**

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "baseUrl": ".",
        "rootDir": "src"
    },
    "include": ["src"]
}
```

- [x] **Step 3.3: Create `packages/utils/vitest.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        globals: true,
        environment: "happy-dom",
    },
})
```

- [x] **Step 3.4: Create `packages/utils/biome.json`**

```json
{
    "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
    "extends": ["../../biome.json"],
    "linter": {
        "rules": {
            "suspicious": {
                "noRestrictedImports": {
                    "level": "error",
                    "options": {
                        "paths": {
                            "@/*": "Packages must not import from the app alias (@/…).",
                            "@sphere/ui": "@sphere/utils must not depend on @sphere/ui.",
                            "react": "@sphere/utils is React-free by design.",
                            "react-dom": "@sphere/utils is React-free by design.",
                            "maplibre-gl": "@sphere/utils must not depend on maplibre-gl.",
                            "@maplibre/maplibre-gl-style-spec": "@sphere/utils must not depend on maplibre.",
                            "@tauri-apps/api": "@sphere/utils must not depend on Tauri.",
                            "@reduxjs/toolkit": "@sphere/utils must not depend on Redux.",
                            "react-redux": "@sphere/utils must not depend on Redux."
                        }
                    }
                }
            }
        }
    },
    "files": {
        "include": ["src/**/*.ts"]
    }
}
```

Biome 1.9 expresses `noRestrictedImports` as shown above. If Biome's schema version differs at the time of execution, adjust the rule name per the schema at `https://biomejs.dev/schemas/1.9.0/schema.json` but keep the same set of forbidden specifiers.

- [x] **Step 3.5: Move the 15 files with `git mv`**

```bash
cd /Users/tmshv/Workspace/__github_tmshv/sphere
for f in array array.test math math.test once once.test path path.test stat stat.test time time.test predict-data-type predict-data-type.test color-scheme; do
    git mv apps/sphere/src/lib/${f}.ts packages/utils/src/${f}.ts
done
```

Verify:

```bash
ls packages/utils/src/
```

Expected 15 files:
```
array.test.ts array.ts color-scheme.ts math.test.ts math.ts once.test.ts once.ts path.test.ts path.ts predict-data-type.test.ts predict-data-type.ts stat.test.ts stat.ts time.test.ts time.ts
```

- [x] **Step 3.6: Reinstall to symlink the new package**

```bash
npm install
ls -la node_modules/@sphere/
```

Expected: two symlinks — `app -> ../../apps/sphere` and `utils -> ../../packages/utils`.

- [x] **Step 3.7: Rewrite imports in the four consumers**

Edit each file, changing only the single import line shown. Do not touch other lines.

**`apps/sphere/src/lib/tauri.ts`** — line 1 becomes:
```ts
import { once } from "@sphere/utils/once"
```

**`apps/sphere/src/hooks/useFeatureProperties.ts`** — change the line that reads `import { deduplicate } from "@/lib/array"` to:
```ts
import { deduplicate } from "@sphere/utils/array"
```

**`apps/sphere/src/store/listeners/add-blank-layer.ts`** — line 1 becomes:
```ts
import { nextColor } from "@sphere/utils/color-scheme"
```

**`apps/sphere/src/ui/PropertiesViewer/index.tsx`** — line 1 becomes:
```ts
import { isUrl } from "@sphere/utils/predict-data-type"
```

(This file is still under `apps/sphere/src/ui/` at this point — it moves to the UI package in Task 4. The import stays correct across the move.)

- [x] **Step 3.8: Look for any stragglers**

```bash
cd /Users/tmshv/Workspace/__github_tmshv/sphere
rg --type ts --type tsx '@/lib/(array|math|once|path|stat|time|predict-data-type|color-scheme)' apps/sphere packages || echo "no stragglers"
```

Expected: `no stragglers` (the `||` clause). If any match, rewrite them the same way.

- [x] **Step 3.9: Typecheck the whole workspace**

```bash
npm run typecheck
```

Expected: exit 0. Common failure modes:
- Unresolved `@sphere/utils/*` in the app → double-check `apps/sphere/tsconfig.json` has the `@sphere/utils/*` path mapping.
- `@sphere/utils` package fails to resolve — verify the package exists in `node_modules/@sphere/utils` as a symlink.

- [x] **Step 3.10: Test**

```bash
npm run test
```

Expected: all tests pass across both workspaces. `packages/utils` should report 7 test files (one per `*.test.ts`; no test for `color-scheme`).

- [x] **Step 3.11: Lint**

```bash
npm run lint
```

Expected: exit 0. The deliberate-violation verification in Task 5 confirms the package-level rules are wired up — no action needed here.

- [x] **Step 3.12: HMR verification** (skipped - requires manual GUI interaction)

```bash
npm run tauri dev
```

While the app is running, open `packages/utils/src/math.ts` in an editor and add a trailing blank line. Save. In the running app, Vite should log an HMR update in the dev console within ~1 s. If nothing logs, open `apps/sphere/vite.config.ts` and add `followSymlinks: true` inside the existing `server.watch` block:

```ts
watch: {
    ignored: ["**/src-tauri/**"],
    followSymlinks: true,
},
```

Revert the trailing blank line in `math.ts`. Close the app with `Cmd+Q`.

- [x] **Step 3.13: Commit**

```bash
git add -A
git status
git commit -m "Extract pure utilities into @sphere/utils workspace package"
```

---

## Task 4: Extract `@sphere/ui`

**Goal:** Move all of `apps/sphere/src/ui/*` and `apps/sphere/src/test-utils.tsx` into a new `@sphere/ui` package. Rewrite every consumer import. React and Mantine become peer deps of the package.

**Files:**
- Move: `apps/sphere/src/ui/` -> `packages/ui/src/` (entire tree)
- Move: `apps/sphere/src/test-utils.tsx` -> `packages/ui/src/test-utils.tsx`
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/biome.json`
- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/src/setupTests.ts` (one-line jest-dom matcher import; duplicated rather than referenced back into the app)
- Modify: `packages/ui/src/PropertiesTable/index.tsx` (intra-package self-import)
- Modify: every `*.test.tsx` inside `packages/ui/src/` that uses `@/test-utils` (six files)
- Modify: every file under `apps/sphere/src/` that imports `@/ui/*` or `@/test-utils` (list in Step 4.9)

### Steps

- [x] **Step 4.1: Create `packages/ui/package.json`**

```json
{
    "name": "@sphere/ui",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
        "./ActionBar":                       "./src/ActionBar/index.tsx",
        "./AppLayout":                       "./src/AppLayout/index.tsx",
        "./ContextMenu":                     "./src/ContextMenu/index.tsx",
        "./ErrorFallback":                   "./src/ErrorFallback/index.tsx",
        "./ErrorFallback/RootErrorFallback": "./src/ErrorFallback/RootErrorFallback.tsx",
        "./ImageMarker":                     "./src/ImageMarker/index.tsx",
        "./Outline":                         "./src/Outline/index.tsx",
        "./Outline/OutlineItem":             "./src/Outline/OutlineItem.tsx",
        "./Overlay":                         "./src/Overlay/index.tsx",
        "./PropertiesTable":                 "./src/PropertiesTable/index.tsx",
        "./PropertiesViewer":                "./src/PropertiesViewer/index.tsx",
        "./Sidebar":                         "./src/Sidebar/index.tsx",
        "./Statusbar":                       "./src/Statusbar/index.tsx",
        "./ThemeProvider":                   "./src/ThemeProvider/index.tsx",
        "./Toolbar":                         "./src/Toolbar/index.tsx",
        "./test-utils":                      "./src/test-utils.tsx"
    },
    "dependencies": {
        "@sphere/utils": "*"
    },
    "peerDependencies": {
        "react": "^18.3.0",
        "react-dom": "^18.3.0",
        "@mantine/core": "^5.10.5",
        "@mantine/hooks": "^5.10.5",
        "@emotion/react": "^11.14.0",
        "@tabler/icons": "^1.119.0"
    },
    "scripts": {
        "typecheck": "tsc --noEmit",
        "test": "vitest run"
    }
}
```

- [x] **Step 4.2: Create `packages/ui/tsconfig.json`**

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "baseUrl": ".",
        "rootDir": "src",
        "paths": {
            "@sphere/utils/*": ["../utils/src/*"]
        }
    },
    "include": ["src"]
}
```

Reason for re-declaring `@sphere/utils/*` here: child `tsconfig.json` files that set `paths` fully replace the parent's `paths`. Since `@sphere/ui` depends on `@sphere/utils`, we must re-add that mapping with a relative prefix from `packages/ui/`.

- [x] **Step 4.3: Create `packages/ui/src/setupTests.ts`**

Duplicate the one-liner into the package so `@sphere/ui` tests don't depend on files inside the app (wrong-direction dependency). Write:

```ts
import "@testing-library/jest-dom"
```

- [x] **Step 4.4: Create `packages/ui/vitest.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
    plugins: [react()],
    test: {
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        globals: true,
        environment: "happy-dom",
        setupFiles: ["./src/setupTests.ts"],
    },
})
```

- [x] **Step 4.5: Create `packages/ui/biome.json`**

```json
{
    "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
    "extends": ["../../biome.json"],
    "linter": {
        "rules": {
            "suspicious": {
                "noRestrictedImports": {
                    "level": "error",
                    "options": {
                        "paths": {
                            "@/*": "Packages must not import from the app alias (@/…).",
                            "@tauri-apps/api": "@sphere/ui must not depend on Tauri.",
                            "@reduxjs/toolkit": "@sphere/ui must not depend on Redux.",
                            "react-redux": "@sphere/ui must not depend on Redux.",
                            "maplibre-gl": "@sphere/ui must not depend on maplibre-gl.",
                            "@maplibre/maplibre-gl-style-spec": "@sphere/ui must not depend on maplibre.",
                            "react-map-gl": "@sphere/ui must not depend on react-map-gl."
                        }
                    }
                }
            }
        }
    },
    "files": {
        "include": ["src/**/*.ts", "src/**/*.tsx"]
    }
}
```

- [x] **Step 4.6: Move the UI tree and `test-utils.tsx`**

```bash
cd /Users/tmshv/Workspace/__github_tmshv/sphere
git mv apps/sphere/src/ui packages/ui/src
git mv apps/sphere/src/test-utils.tsx packages/ui/src/test-utils.tsx
```

Verify:

```bash
ls packages/ui/src/
```

Expected directories (plus `test-utils.tsx`):
```
ActionBar AppLayout ContextMenu ErrorFallback ImageMarker Outline Overlay PropertiesTable PropertiesViewer Sidebar Statusbar ThemeProvider Toolbar test-utils.tsx
```

- [x] **Step 4.7: Fix the intra-UI self-import**

`packages/ui/src/PropertiesTable/index.tsx` currently has:
```ts
import { Select, type SelectOption, Statusbar } from "@/ui/Statusbar"
```

Change to a relative import (within the UI package, `@/ui/…` is now meaningless):
```ts
import { Select, type SelectOption, Statusbar } from "../Statusbar"
```

- [x] **Step 4.8: Fix `test-utils` imports inside the UI package**

The following moved test files still reference `@/test-utils`:
- `packages/ui/src/PropertiesViewer/CopyButton.test.tsx`
- `packages/ui/src/ActionBar/index.test.tsx`
- `packages/ui/src/Outline/index.test.tsx`
- `packages/ui/src/ErrorFallback/index.test.tsx`
- `packages/ui/src/ContextMenu/index.test.tsx`
- `packages/ui/src/Statusbar/Select.test.tsx`

Rewrite each first line from `from "@/test-utils"` to `from "../test-utils"` (relative, one level up from each file's parent dir to its sibling `test-utils.tsx`). Example:

Before:
```ts
import { fireEvent, render, screen } from "@/test-utils"
```
After:
```ts
import { fireEvent, render, screen } from "../test-utils"
```

Note: `CopyButton.test.tsx` lives at `packages/ui/src/PropertiesViewer/CopyButton.test.tsx`, so `../test-utils` resolves to `packages/ui/src/test-utils.tsx` — correct.

- [x] **Step 4.9: Reinstall to symlink the new package**

```bash
npm install
ls -la node_modules/@sphere/
```

Expected: three symlinks — `app`, `ui`, `utils`. A warning about peer dependency versions may appear; that's fine because the app resolves them.

- [x] **Step 4.10: Rewrite app imports**

Each app file below changes an `@/ui/*` import to `@sphere/ui/*`. Do not change anything else in these files.

**`apps/sphere/src/main.tsx`** — line 10:
```ts
import { RootErrorFallback } from "@sphere/ui/ErrorFallback/RootErrorFallback"
```

**`apps/sphere/src/components/App/index.tsx`** — lines 7–10:
```ts
import { AppLayout } from "@sphere/ui/AppLayout"
import { ErrorFallback } from "@sphere/ui/ErrorFallback"
import { Overlay } from "@sphere/ui/Overlay"
import { Sidebar } from "@sphere/ui/Sidebar"
```

**`apps/sphere/src/components/SourcesOutline/index.tsx`** — lines 2–3:
```ts
import { Outline, type OutlineOnMove, type OutlineRenderItem } from "@sphere/ui/Outline"
import { OutlineItem } from "@sphere/ui/Outline/OutlineItem"
```

**`apps/sphere/src/components/LayersOutline/index.tsx`** — lines 3–4:
```ts
import { Outline, type OutlineOnMove, type OutlineRenderItem } from "@sphere/ui/Outline"
import { OutlineItem } from "@sphere/ui/Outline/OutlineItem"
```

**`apps/sphere/src/components/PropertiesPopup/index.tsx`** — lines 3–4:
```ts
import { Overlay } from "@sphere/ui/Overlay"
import { PropertiesViewer } from "@sphere/ui/PropertiesViewer"
```

**`apps/sphere/src/components/MapStatusbar/index.tsx`** — line 12:
```ts
import { Statusbar } from "@sphere/ui/Statusbar"
```

**`apps/sphere/src/components/SphereThemeProvider/index.tsx`** — line 3:
```ts
import { ThemeProvider } from "@sphere/ui/ThemeProvider"
```

**`apps/sphere/src/components/LeftSidebar/LayersTab.tsx`** — line 3:
```ts
import { ActionBar, type ActionBarOnClick } from "@sphere/ui/ActionBar"
```

**`apps/sphere/src/components/LeftSidebar/SourcesTab.tsx`** — line 5:
```ts
import { ActionBar, type ActionBarOnClick } from "@sphere/ui/ActionBar"
```

**`apps/sphere/src/components/PhotoLayer/index.tsx`** — line 2:
```ts
import { ImageMarker, type ImageMarkerLayout } from "@sphere/ui/ImageMarker"
```

**`apps/sphere/src/components/SourcePanel/index.tsx`** — line 4:
```ts
import { ActionBar } from "@sphere/ui/ActionBar"
```

**`apps/sphere/src/components/SphereMap/Draw.tsx`** — line 8:
```ts
import { Overlay } from "@sphere/ui/Overlay"
```

**`apps/sphere/src/components/LayerPanel/index.tsx`** — line 5:
```ts
import { ActionBar } from "@sphere/ui/ActionBar"
```

**`apps/sphere/src/components/MapContextMenu/index.tsx`** — line 5:
```ts
import { ContextMenu } from "@sphere/ui/ContextMenu"
```

**`apps/sphere/src/components/MapContextMenu/index.test.tsx`** — line 1:
```ts
import { render, screen } from "@sphere/ui/test-utils"
```

- [x] **Step 4.11: Look for any stragglers**

```bash
rg --type ts --type tsx '@/ui/|@/test-utils' apps/sphere packages || echo "no stragglers"
```

Expected: `no stragglers`. If any match, rewrite them the same way.

- [x] **Step 4.12: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0. Common failure modes:
- `Cannot find module '@sphere/ui/Foo' or its corresponding type declarations.` → check `packages/ui/package.json` `exports` and confirm the subpath exists.
- `Module '@sphere/utils/math' has no exported member` inside `@sphere/ui` → double-check `packages/ui/tsconfig.json` has the `@sphere/utils/*` path mapping.

- [x] **Step 4.13: Test**

```bash
npm run test
```

Expected: same total test count as before the migration. The UI package should report ~7 test files; the app should report the rest.

- [x] **Step 4.14: Verify single React instance**

```bash
find node_modules -maxdepth 3 -name react -type d
```

Expected: exactly one `node_modules/react` directory. If there's a second one under `node_modules/@sphere/ui/node_modules/react`, the peer dep wasn't respected — verify `packages/ui/package.json` lists React under `peerDependencies`, not `dependencies`.

- [x] **Step 4.15: Full Tauri dev smoke test**

```bash
npm run tauri dev
```

Exercise:
1. App opens, map renders.
2. Open a `samples/*.geojson` — layer appears in the sidebar.
3. Click a feature — the properties popup (uses `@sphere/ui/PropertiesViewer`) renders with URLs highlighted (this is the `isUrl` cross-package import from `@sphere/utils/predict-data-type`).
4. Toggle dark/light theme (system theme change) — `@sphere/ui/ThemeProvider` is exercised.
5. Open the left sidebar, switch between Sources and Layers tabs — `@sphere/ui/ActionBar` and `@sphere/ui/Outline` are exercised.
6. Right-click on the map — `@sphere/ui/ContextMenu` opens.
7. Close with `Cmd+Q`.

- [x] **Step 4.16: Commit**

```bash
git add -A
git status
git commit -m "Extract presentational components into @sphere/ui workspace package"
```

---

## Task 5: Lock down boundaries and document layering

**Goal:** Prove the `noRestrictedImports` rules actually fail lint when violated, and document the layering rule in the repo so it's discoverable.

**Files:**
- Modify: `CLAUDE.md` (new section)

### Steps

- [x] **Step 5.1: Verify the utils boundary rule fires**

Temporarily add a forbidden import to a utils file:

```bash
cd /Users/tmshv/Workspace/__github_tmshv/sphere
```

Open `packages/utils/src/math.ts` and add as line 1:

```ts
import { invoke } from "@tauri-apps/api/core"
```

Then:

```bash
npm run lint
```

Expected: Biome exits non-zero with an error pointing at `packages/utils/src/math.ts:1` citing the `noRestrictedImports` rule and the message from Step 3.4. If Biome passes, the rule is not wired up — debug `packages/utils/biome.json` until it fails.

Revert the change:

```bash
git checkout packages/utils/src/math.ts
```

- [x] **Step 5.2: Verify the UI boundary rule fires**

Open `packages/ui/src/Statusbar/index.tsx` and add as line 1:

```ts
import { useDispatch } from "react-redux"
```

Then:

```bash
npm run lint
```

Expected: Biome exits non-zero citing the `react-redux` restriction in `packages/ui/biome.json`.

Revert:

```bash
git checkout packages/ui/src/Statusbar/index.tsx
```

- [x] **Step 5.3: Verify the `@/*` rule catches path aliases**

Open `packages/ui/src/Sidebar/index.tsx` and add as line 1:

```ts
import type { Source } from "@/types/source"
```

Run `npm run typecheck` — expected: TS fails with "cannot find module '@/types/source'" because the UI package tsconfig does not define `@/*`.
Run `npm run lint` — expected: Biome also fails citing the restricted-import rule.

Revert:

```bash
git checkout packages/ui/src/Sidebar/index.tsx
```

This confirms the two-layer enforcement (type system + linter) catches violations even if one mechanism is misconfigured.

- [x] **Step 5.4: Add "Frontend layering" section to `CLAUDE.md`**

Edit `CLAUDE.md` (at repo root). Insert the following new section immediately after the "## Architecture" section (before "## Key Dependencies"):

````markdown
## Frontend Layering

The frontend is an npm workspaces monorepo. Packages depend only downward:

```
apps/sphere  ->  @sphere/ui  ->  @sphere/utils
```

- `@sphere/utils` (`packages/utils/`) — pure TS helpers. No React, no maplibre, no Tauri, no Redux, no domain types. Imported per subpath: `import { lerp } from "@sphere/utils/math"`.
- `@sphere/ui` (`packages/ui/`) — Mantine-based presentational components. No Tauri, no Redux, no maplibre. React and Mantine are peer deps.
- `apps/sphere/` — the Tauri app. May import from both packages and from `@/*` (app-local paths).

Boundaries are enforced by:

1. `packages/*/package.json` declaring only allowed deps.
2. `packages/*/biome.json` using `noRestrictedImports` to forbid back-references.
3. `packages/*/tsconfig.json` not defining `@/*`, so the app alias cannot leak in.

Violations fail `npm run typecheck` and `npm run lint`. To add code to a package, audit the new file's imports — if it imports anything restricted, it stays in the app. Never silence the lint rule — restructure instead.

To bump the app's version, run `npm version patch -w @sphere/app` from the repo root. That updates `apps/sphere/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock` atomically via `scripts/version.js`.
````

- [x] **Step 5.5: Final verification run**

```bash
npm run typecheck
npm run test
npm run lint
npm run tauri dev           # quick smoke — open window, close with Cmd+Q
```

Expected: all green, app runs.

- [x] **Step 5.6: Commit**

```bash
git add CLAUDE.md
git commit -m "Document frontend monorepo layering in CLAUDE.md"
```

---

## Post-plan checklist

After Task 5 is committed, verify end-to-end:

- [x] `git log --oneline -6` shows exactly five new commits on top of the starting HEAD, one per task.
- [x] `npm run typecheck && npm run test && npm run lint && npm run build` all exit 0.
- [ ] `npm run tauri build` produces a working bundle. (manual - requires full Rust build)
- [x] `ls packages/utils/src | wc -l` returns 15. `ls packages/ui/src | wc -l` returns 14.
- [x] `find node_modules -maxdepth 3 -name react -type d` returns exactly one hit.
- [ ] Issue #218 is referenced in the PR description when opening the PR. (applies at PR creation time)

If anything fails, stop and debug before declaring done.
