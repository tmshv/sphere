# Linux AppImage release Implementation Plan (issue-212)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a Linux AppImage artifact alongside the existing macOS/Windows artifacts on every `release` workflow run, and align both CI workflows on Tauri 2's expected appindicator package name.

**Architecture:** Two YAML edits. (1) `.github/workflows/release.yaml` — add `ubuntu-22.04` to the `publish-tauri` matrix, install Tauri 2 system deps on Linux only, and restrict the Linux bundle to AppImage via `--bundles appimage`. (2) `.github/workflows/test.yaml` — rename `libappindicator3-dev` to `libayatana-appindicator3-dev` in the `test-tauri` job. Local validation on Debian 13 already confirms the build succeeds and the AppImage launches.

**Tech Stack:** GitHub Actions, `tauri-apps/tauri-action@v0`, ubuntu-22.04 runner, Tauri 2.9.

**Spec:** `docs/specs/20260520-linux-appimage-release.md`

---

## Pre-flight checklist

Run once before starting:

```bash
cd /Users/tmshv/Workspace/__github_tmshv/sphere
git status                  # expect: clean working tree (spec commit already on master is fine)
git checkout -b issue-212
```

---

## File structure (what changes, at a glance)

**Modified:**
- `.github/workflows/test.yaml` — one-line package rename in `test-tauri` job
- `.github/workflows/release.yaml` — matrix entry, install step, conditional `args`

**Not touched:**
- `src-tauri/tauri.conf.json` — `targets: "all"` stays; AppImage restriction is applied per-platform via the CLI flag
- Any source code

---

### Task 1: Align `test.yaml` on the ayatana appindicator package

The current `test-tauri` job installs the deprecated `libappindicator3-dev`. Tauri 2 expects `libayatana-appindicator3-dev`. Renaming first means the rest of the work happens against a consistent baseline.

**File:** `.github/workflows/test.yaml`

- [x] Open `.github/workflows/test.yaml` and find line 64 inside the `test-tauri` job's `install system dependencies` step. It currently reads:

  ```yaml
                    sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
  ```

- [x] Replace `libappindicator3-dev` with `libayatana-appindicator3-dev` so the line becomes:

  ```yaml
                    sudo apt-get install -y libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf
  ```

- [x] Run `git diff .github/workflows/test.yaml` and confirm only that one package name changed.

- [x] Commit:

  ```bash
  git add .github/workflows/test.yaml
  git commit -m "Use libayatana-appindicator3-dev in test-tauri job"
  ```

---

### Task 2: Add Linux to the release matrix and restrict its bundle to AppImage

This is the substantive change. Three edits to the same file, made together because partial intermediate states would either fail or be misleading.

**File:** `.github/workflows/release.yaml`

- [x] Open `.github/workflows/release.yaml`. Locate the `publish-tauri` job's matrix block (around lines 57–60):

  ```yaml
          strategy:
              fail-fast: false
              matrix:
                  platform: [macos-latest, windows-latest]
                  # platform: [macos-latest, ubuntu-latest, windows-latest]
  ```

  Replace those two `platform:` lines with a single active matrix line that includes `ubuntu-22.04`:

  ```yaml
          strategy:
              fail-fast: false
              matrix:
                  platform: [macos-latest, windows-latest, ubuntu-22.04]
  ```

- [x] Locate the commented-out install step (around lines 81–86):

  ```yaml
              # - name: install dependencies (ubuntu only)
              #   if: matrix.platform == 'ubuntu-latest'
              #   run: |
              #     sudo apt-get update
              #     sudo apt-get install -y libgtk-3-dev webkit2gtk-4.0 libappindicator3-dev librsvg2-dev patchelf
  ```

  Replace the entire commented block with this active step (note: matches the Debian 13 list that was just validated locally, minus packages preinstalled on the GitHub runner — `build-essential`, `curl`, `wget`, `file`):

  ```yaml
              - name: install dependencies (linux only)
                if: matrix.platform == 'ubuntu-22.04'
                run: |
                    sudo apt-get update
                    sudo apt-get install -y \
                      libwebkit2gtk-4.1-dev \
                      libayatana-appindicator3-dev \
                      librsvg2-dev \
                      libxdo-dev \
                      libssl-dev \
                      patchelf
  ```

  Place this step between `setup node` and `install Rust stable` so system libraries are present before any cargo work. Match the surrounding indentation (8 spaces for the `-` marker).

- [x] Locate the `tauri-apps/tauri-action@v0` step (around lines 90–99). It currently reads:

  ```yaml
              - uses: tauri-apps/tauri-action@v0
                env:
                    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
                with:
                    tagName: v__VERSION__ # the action automatically replaces \_\_VERSION\_\_ with the app version
                    releaseName: "v__VERSION__"
                    releaseBody: "See the assets to download this version and install."
                    releaseDraft: true
                    prerelease: false
                    includeDebug: false
  ```

  Add an `args` key that is `--bundles appimage` on Linux and an empty string everywhere else. Insert it as the last key inside `with:`:

  ```yaml
              - uses: tauri-apps/tauri-action@v0
                env:
                    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
                with:
                    tagName: v__VERSION__ # the action automatically replaces \_\_VERSION\_\_ with the app version
                    releaseName: "v__VERSION__"
                    releaseBody: "See the assets to download this version and install."
                    releaseDraft: true
                    prerelease: false
                    includeDebug: false
                    args: ${{ matrix.platform == 'ubuntu-22.04' && '--bundles appimage' || '' }}
  ```

- [x] Run `git diff .github/workflows/release.yaml` and confirm exactly three logical changes: matrix line replaced, commented install block replaced with an active step, and `args:` line added to the tauri-action step. No other edits.

- [x] Sanity-check YAML syntax with Python (no extra deps needed; macOS ships `python3`):

  ```bash
  python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/release.yaml')); print('ok')"
  ```

  Expected output: `ok`. If you see a `ScannerError` or `ParserError`, fix the indentation before continuing.

- [x] Commit:

  ```bash
  git add .github/workflows/release.yaml
  git commit -m "Build Linux AppImage in release workflow (#212)"
  ```

---

### Task 3: Push the branch and open the PR

The `test.yaml` change runs in CI as soon as the PR is open (it's `pull_request`-triggered with `paths` covering `src-tauri/**` and `crates/**` — but since this PR only changes workflow files, the path filter won't trigger the test job; that's expected and fine). The `release.yaml` change is only exercised by `workflow_dispatch`, so the real validation happens after merge, when you manually run `release`.

- [x] Push the branch:

  ```bash
  git push -u origin issue-212
  ```

- [x] Open the PR:

  ```bash
  gh pr create --title "Build Linux AppImage in release workflow (#212)" --body "$(cat <<'EOF'
  Closes #212. Adds an `ubuntu-22.04` entry to the release matrix, installs the Tauri 2 build prerequisites, and restricts the Linux bundle to AppImage. Aligns `test.yaml` on the ayatana appindicator package name. AppImage build validated locally on Debian 13.
  EOF
  )"
  ```

- [x] Confirm the PR URL is printed. Watch any CI runs that fire on it; none of the existing test jobs gate on workflow file paths, so the PR should be mergeable without CI signal beyond passing the manual review.

---

### Task 4: Validate the release workflow (after merge)

This task is run by the maintainer after the PR is merged to `master`. It produces the first real AppImage in a draft GitHub release.

- [x] On GitHub, go to Actions → "release" workflow → "Run workflow". Choose `patch` (or `minor`/`major` as appropriate) and run it.

- [x] Wait for the matrix to finish. Expected outcome: three successful jobs (`macos-latest`, `windows-latest`, `ubuntu-22.04`). If the Linux job fails, capture the failing step's log and iterate on the apt package list before retrying.

- [x] Open the resulting draft release. Expected assets:
  - `Sphere_<version>_x64.dmg` (or `.app.tar.gz`) from macOS
  - `Sphere_<version>_x64_en-US.msi` from Windows
  - `Sphere_<version>_amd64.AppImage` from Linux
  - No `.deb` or `.rpm` artifacts

- [x] Download the AppImage on a Linux machine, `chmod +x` it, run it, and verify the app opens. (You've already validated the equivalent local build on Debian 13, so this is final smoke-test rather than discovery.)

- [x] Publish the draft release.

---

## Self-review notes

Spec coverage: every section of `docs/specs/20260520-linux-appimage-release.md` maps to a task — `test.yaml` rename → Task 1, release matrix + install step + bundle restriction → Task 2, acceptance criteria → Task 4. No placeholders. The `args` expression `${{ matrix.platform == 'ubuntu-22.04' && '--bundles appimage' || '' }}` is GitHub Actions' idiomatic ternary; it evaluates to the empty string on macOS/Windows so the action falls back to its default behavior. Indentation in the install step matches the surrounding 8-space style used throughout `release.yaml`.
