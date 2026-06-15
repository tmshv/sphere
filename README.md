# Sphere

![](assets/sphere-screenshot-01.png)
![](assets/sphere-screenshot-02.png)
![](assets/sphere-screenshot-03.png)

Sphere is a geospatial data visualization and editing desktop application built with Tauri (Rust backend) and React/TypeScript (frontend), using MapLibre GL for map rendering. It loads **GeoJSON, Shapefile, CSV, GPX, and MBTiles** sources.

## Prerequisites

- Node 24 (managed via [Mise](https://mise.jdx.dev/))
- Rust 1.92

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)


## Release

### Version locations

The app version is stored in files that must stay in sync:

| File                        | Field     | Updated by                |
|-----------------------------|-----------|---------------------------|
| `apps/sphere/package.json`  | `version` | `npm version`             |
| `src-tauri/tauri.conf.json` | `version` | `scripts/version.js`      |
| `src-tauri/Cargo.toml`      | `version` | `scripts/version.js`      |
| `src-tauri/Cargo.lock`      | `version` | `cargo update` (via hook) |

The script `scripts/version.js` copies the version from `apps/sphere/package.json` into `tauri.conf.json` and `Cargo.toml`, then runs `cargo update` to sync `Cargo.lock`. It runs automatically as the npm `version` hook on `@sphere/app`.

### How to release

1. Bump the version — pick one of `patch`, `minor`, or `major`:

   ```bash
   npm version patch -w @sphere/app   # e.g. 0.9.4 → 0.9.5
   ```

   This command:
   - Updates `version` in `apps/sphere/package.json`
   - Runs `scripts/version.js` to sync `tauri.conf.json`, `Cargo.toml`, and `Cargo.lock`
   - Stages the changed files and creates a commit
   - Tags the commit as `v<version>`

2. Push the tag:

   ```bash
   git push --tags
   ```

3. GitHub Actions (`publish.yaml`) picks up the `v*` tag and builds macOS and Windows binaries using `tauri-apps/tauri-action`. A **draft** GitHub Release is created with the build artifacts attached.

4. Open the draft release on GitHub, edit the release notes, and publish it.


## Internal URL Scheme

Sphere uses a custom `sphere://` protocol to access loaded data sources by ID:

| URL                                     | Description         |
|-----------------------------------------|---------------------|
| `sphere://{id}`                         | Source GeoJSON data |
| `sphere://{id}/tilejson`                | TileJSON metadata   |
| `sphere://{id}/tile?z={z}&x={x}&y={y}`  | Tile bytes          |

Source IDs are short alphanumeric strings (e.g. `K7X2MR`) generated when a source is loaded. File-based sources use a SHA-256 digest of the source URL as their ID.


## Related Links

- [kt-companion.vercel.app](https://kt-companion.vercel.app)
- [gpxstudio.github.io](https://github.com/gpxstudio/gpxstudio.github.io)
- [geojson.io](https://geojson.io)
- [mapshaper](https://mapshaper.org)
