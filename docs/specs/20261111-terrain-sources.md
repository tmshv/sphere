# Terrain and hillshade from user sources

## Intent

The status bar has a Terrain button that is hard-wired to `disabled`. The terrain slice still points at a
`mapbox-dem` source that `SphereMap/index.tsx` only mounts behind a `mapbox://` URL, so terrain has been dead
since basemaps became user sources.

Bring terrain back, but sourced from the user's own project: the user adds elevation tiles (an MBTiles file
on disk, or the Mapterhorn web tiles), and the button comes alive. The same tiles also drive a hillshade.
Sphere does not ship hidden elevation data and does not guess.

## Goals

- Terrain uses an elevation source the user added to the project.
- The Terrain button is enabled only when such a source exists.
- One place to set up relief: a popup on the Terrain button with source, exaggeration and hillshade.
- A Spotlight action adds Mapterhorn as an elevation source.
- Hillshade ships in v1.

## Non-goals (v1)

- Detecting whether a raster tileset really contains elevation. The user is trusted.
- Choosing the encoding per source. All MBTiles candidates are treated as Terrarium.
- Hillshade styling (colors, illumination direction, intensity).
- Showing terrain/hillshade in the Layers panel or making them editable as layers.
- Reading `encoding` from arbitrary TileJSON URLs.

## Anti-goals

- No hidden logic that overrides what the user set. Adding a source never changes the current terrain
  source, exaggeration, or the on/off state of terrain or hillshade — except the one Mapterhorn case below.
- No faked state: the button is never enabled when there is nothing to show.

## Terrain candidates

A source is a terrain candidate when it is either:

1. A raster MBTiles source (`SourceType.MVT` with a raster tile format, i.e. `isRasterTileFormat(format)`),
   treated as **Terrarium** encoding. Encoding lives in one named constant.
2. A web raster source (`SourceType.Raster`) that declares a DEM encoding. Today only the Mapterhorn preset
   does. OSM and Sentinel-2 basemaps declare none and are never candidates.

Vector MBTiles, GeoJSON and FeatureCollection sources are never candidates.

Candidate detection is one selector / predicate, defined once (see "One place per concept" in AGENTS.md).

## Current terrain source

- The terrain slice stores the id of the current terrain source (replacing the hard-coded `"mapbox-dem"`).
- The current source changes only when the user picks one in the popup, or when it has to be resolved:
  - when no current source is set and a candidate appears, the most recently added candidate becomes
    current;
  - when the current source is removed, the most recently added remaining candidate becomes current;
  - when no candidates remain, there is no current source and terrain and hillshade render nothing.
- Adding a new candidate while a current source exists does **not** switch to it.
- Per "never destroy user input silently", the user's toggles and exaggeration are not reset when
  candidates disappear; the selector simply produces no terrain/hillshade while there is no valid source.
  The button is disabled in that state. When a candidate appears again, terrain/hillshade resume exactly as
  the user left them — adding a source never flips a toggle, it only restores a valid source for the
  existing settings.
- **Tree visibility does not affect terrain or hillshade.** Visibility (the bulb in the Sources tree) and
  terrain are separate features. A hidden source, or one inside a hidden folder, is still a candidate, can
  still be current, and still drives terrain and hillshade. Hiding it only hides its raster preview /
  raster layer — which is how the user gets rid of the RGB noise of a DEM source on the Sources tab.

## Status bar Terrain button

- Disabled when there are no candidates.
- Icon reflects terrain on/off (`IconMountain` / `IconMountainOff`), `active` when on.
- **Left click**: toggles terrain on/off with the current source.
- **Right click**: opens the terrain popup (whenever at least one candidate exists, even just one).

## Terrain popup

Anchored to the Terrain button. Three controls:

1. **Source** — list of candidates by source name, current one marked. Picking one makes it current and
   turns terrain on.
2. **Exaggeration** — slider. Range 0–3, default 1.5 (the existing slice default). Applies live.
3. **Hillshade** — on/off switch. Independent of terrain: hillshade can be shown on a flat map.

Builder may add the needed `@sphere/ui` building blocks (a popover anchored to a status bar button and a
switch, both on Base UI; `SliderField` already exists). New `@sphere/ui` components get visual-test
baselines.

## Map rendering

- Terrain and hillshade use the current source's tiles mounted as a MapLibre `raster-dem` source with the
  candidate's encoding. The original raster source stays mounted as before, so any raster layer the user has
  on it keeps working.
- Terrain: `map.setTerrain({ source, exaggeration })` (existing `useTerrain` hook / `selectTerrainSpecification`).
- Hillshade: a MapLibre `hillshade` layer with default paint, owned by Sphere (not a Redux user layer).
  Stacking: directly above the topmost raster layer currently on the map, following whatever order the user
  set (Layers tab `fractionIndex`, or Sources tab tree order for preview layers). A vector the user placed
  below that raster ends up under the hillshade too, consistent with it already being under the raster.
  With no raster layer on the map, hillshade goes to the bottom of the stack. It must restack when the
  user reorders layers or tree nodes.
- Terrain and hillshade are map-level, so they show on both the Sources and Layers tabs.
- The Sources tab keeps drawing every visible raster node, DEM candidates included (no special case in
  `preview.ts`). The user hides the node to hide the noise; terrain keeps working (see tree visibility above).
- **Draw mode suspends terrain.** While draw mode is active, `setTerrain(null)` (MapLibre Draw picks wrong
  coordinates on 3D terrain). The user's settings are untouched and terrain returns when draw mode ends.
  Hillshade stays, since it is flat.
- Remove the dead `mapbox-dem` / `mapbox://mapbox.mapbox-terrain-dem-v1` source from `SphereMap/index.tsx`.

## Spotlight: "Add Mapterhorn terrain"

- Same approach as the OSM / Sentinel-2 entries: adds a new web raster source and nothing else is hidden
  behind it. The user can do whatever they want with it afterwards.
- Unlike basemaps it adds **no raster layer** (raw Terrarium tiles are noise to look at). The user can add one.
- Source definition (from `https://tiles.mapterhorn.com/tilejson.json`):
  - tiles: `https://tiles.mapterhorn.com/{z}/{x}/{y}.webp`
  - tileSize: 512
  - encoding: `terrarium`
  - attribution: `<a href='https://mapterhorn.com/attribution'>© Mapterhorn</a>`
  - maxzoom: left to the builder to verify against Mapterhorn (the TileJSON omits it).
- Each call adds a new source, like basemaps.
- **The only automatic behaviour**: if the project had **no terrain candidate** before this source was added,
  Mapterhorn becomes the current terrain source and both terrain and hillshade are turned on. If any candidate
  already existed, nothing else changes (current source, toggles and exaggeration are left alone).
- Adding a raster MBTiles file never flips a toggle; it only becomes current if there was none.

## Other entry points

- The existing Spotlight "Terrain" toggle and the native menu `view.toggle-terrain` keep toggling terrain.
  They must not offer an action that does nothing: the native menu item gets a new `Requires` fact
  (e.g. `hasTerrainSource`) sent through `menu_set_context`, and the Spotlight toggle is hidden or disabled
  under the same condition, matching how other context-dependent entries behave.

## Testing

Per AGENTS.md testing policy: cover the candidate selector, current-source resolution (first candidate,
removal fallback, no switch on add), the Mapterhorn auto-enable rule (both branches), terrain specification
selector with/without a valid source, status bar button enabled/disabled and left-click, popup controls,
and the menu context fact.

## Left to the builder

- Exact state shape in the terrain slice and where "most recently added" order comes from.
- Where the encoding declaration lives on web raster sources/presets.
- `raster-dem` source ids and whether it is mounted only while terrain or hillshade is on.
- How the hillshade layer is placed between raster and vector layers.
- Popup component structure and naming.

## Calls made without explicit confirmation

- Web raster basemaps (OSM, Sentinel) are not candidates.
- Exaggeration slider range 0–3.
- Picking a source in the popup turns terrain on.
- Hillshade is independent of terrain and sits directly above the topmost raster layer.
- Toggles survive losing every candidate and resume when one returns.
- Draw mode suspends terrain (not hillshade).
- Mapterhorn adds no raster layer.
- "No terrain enabled before" read as "no terrain candidate existed before".
- Adding a new candidate never switches the current source (overrides the earlier "most recently added
  is the default" so user settings are not overwritten).
