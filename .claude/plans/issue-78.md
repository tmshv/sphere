# Remove console.log Dead Code (Issue #78)

## Overview
Clean up commented-out console.log blocks from production code. The active console.log
in SphereLayer.tsx was already removed. The remaining work is deleting dead
commented-out blocks in 3 files.

## Context
- Files involved:
  - `src/components/SphereMap/Draw.tsx` (line 35: one commented-out console.log)
  - `src/store/listeners/select-features.ts` (lines 24-34: commented-out block with 2 console.log calls)
  - `src/tauri.ts` (lines 7-24: commented-out hotkey registration block with 2 console.log calls)
- Related patterns: `src/logger.ts` exists with a pino logger instance, but no replacement logging is needed for these debug-only calls
- Dependencies: none

## Development Approach
- **Testing approach**: Regular (no tests needed for dead code removal)
- Simple line-by-line removal of commented-out code blocks
- Complete each task fully before moving to the next

## Implementation Steps

### Task 1: Remove commented-out console.log in Draw.tsx

**Files:**
- Modify: `src/components/SphereMap/Draw.tsx`

- [x] Remove line 35: `// console.log(event.type, event.features)` from the onChange callback body (leave the empty callback body `{}` intact as the noop is intentional)
- [x] Run lint: `npm run lint`

### Task 2: Remove commented-out console.log block in select-features.ts

**Files:**
- Modify: `src/store/listeners/select-features.ts`

- [x] Remove lines 24-34: the entire commented-out block containing source lookup and two console.log calls
- [x] Run lint: `npm run lint`

### Task 3: Remove commented-out console.log block in tauri.ts

**Files:**
- Modify: `src/tauri.ts`

- [x] Remove lines 7-24: the commented-out hotkey registration block containing two console.log calls from inside `handleHotkey()` (leave the empty function body intact)
- [x] Run lint: `npm run lint`

### Task 4: Verify and close

- [x] Run `rg "console\.log" src/` to confirm no active console.log calls remain
- [x] Run full test suite: `npm test`
- [x] Run linter: `npm run lint`
- [x] Move this plan to `docs/plans/completed/`
