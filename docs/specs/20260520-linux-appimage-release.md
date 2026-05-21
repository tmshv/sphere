# Linux release artifacts

Closes #212.

## Goal

Publish Linux release artifacts alongside the existing macOS and Windows artifacts on every release run of `.github/workflows/release.yaml`. The Linux job produces every bundle format Tauri's default Linux pipeline emits — AppImage, `.deb`, and `.rpm` — so users on the major desktop distros can install via their preferred packaging.

## Scope

- Add a Linux runner to the release matrix.
- Install the Tauri 2 build prerequisites on that runner.
- Let `tauri-action` invoke `tauri build` with default arguments so the bundle target inherited from `tauri.conf.json`'s `targets: "all"` produces AppImage, `.deb`, and `.rpm`.
- Align `test.yaml` on the same appindicator package name so both workflows install the package Tauri 2 expects.

Out of scope:

- `tauri.conf.json` changes (`targets: "all"` already does the right thing on every platform).
- README install instructions for Linux.
- AppImage signing or auto-updater configuration.
- A CI job that runs `tauri build` on PRs (the existing `test-tauri` job runs `cargo test` only; bundling is release-only).

## Changes

### `.github/workflows/release.yaml`

1. Extend the `publish-tauri` job matrix from `[macos-latest, windows-latest]` to `[macos-latest, windows-latest, ubuntu-22.04]`.
2. Replace the existing commented-out "install dependencies (ubuntu only)" block with an active step gated by `if: matrix.platform == 'ubuntu-22.04'`. The step runs:

   ```
   sudo apt-get update
   sudo apt-get install -y \
     libwebkit2gtk-4.1-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev \
     libxdo-dev \
     libssl-dev \
     patchelf
   ```

   Rationale for the list:

   - `libwebkit2gtk-4.1-dev` — Tauri 2 WebKit backend (Tauri 1 used 4.0).
   - `libayatana-appindicator3-dev` — current ayatana fork; replaces the deprecated `libappindicator3-dev`.
   - `librsvg2-dev` — required by Tauri's icon pipeline.
   - `libxdo-dev` — required by `tauri-plugin-global-shortcut`-adjacent functionality and other Tauri 2 plugins.
   - `libssl-dev` — required by transitive crates linked into the bundle.
   - `patchelf` — required by `cargo-appimage` / Tauri's AppImage bundler to rewrite the binary's RPATH inside the AppImage payload.

   Packages from the user-supplied list that are intentionally omitted because they ship preinstalled on the `ubuntu-22.04` GitHub runner image: `build-essential`, `curl`, `wget`, `file`.

No `args:` override is passed to `tauri-apps/tauri-action@v0`. Local validation on Debian 13 confirmed the default invocation produces `.AppImage`, `.deb`, and `.rpm` together, which is the desired set of Linux artifacts.

### `.github/workflows/test.yaml`

One-line change on the `test-tauri` job: replace `libappindicator3-dev` with `libayatana-appindicator3-dev` so test and release agree on the appindicator variant Tauri 2 expects.

## Acceptance criteria

- Running the `release` workflow with any bump produces a draft release containing the existing macOS `.dmg` and Windows `.msi` artifacts plus three new Linux artifacts: `Sphere_<version>_amd64.AppImage`, `Sphere_<version>_amd64.deb`, and `Sphere-<version>-1.x86_64.rpm`.
- The Linux job uses `ubuntu-22.04`, so the resulting binaries run on distros shipping glibc 2.35 or newer (Ubuntu 22.04+, Debian 12+, Fedora 36+).
- The `test-tauri` job in `test.yaml` continues to pass with the renamed appindicator package.

## Risks

- Linux bundling can be sensitive to system library mismatches; the first release may surface missing `apt` packages not yet listed. Mitigation: monitor the first release run and add packages iteratively.
- The `ubuntu-22.04` GitHub-hosted runner image is scheduled for eventual deprecation. When that happens, the matrix entry will need to move forward and the glibc compatibility floor will rise accordingly.
