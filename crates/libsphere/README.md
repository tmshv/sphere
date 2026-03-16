# libsphere

Geospatial data processing library for the Sphere application. Handles loading, parsing, and converting geospatial sources into GeoJSON, with support for schema inference and feature ID assignment.

## Supported Formats

| Format      | Extension    |
|-------------|--------------|
| GeoJSON     | `.geojson`   |
| GeoJSON Seq | `.geojsonl`  |
| Shapefile   | `.shp`       |
| CSV         | `.csv`       |
| GPX         | `.gpx`       |
| MBTiles     | `.mbtiles`   |

## Usage

### Load a source from a URL

```rust
use libsphere::source::Source;
use url::Url;

let url = Url::parse("file:///data/layer.geojson").unwrap();
let source = Source::from_url(url).unwrap();

let geojson = source.to_geojson().unwrap();
let schema = source.get_schema().unwrap();
let bounds = source.get_bounds(); // Option<(west, south, east, north)>
```

### CSV sources

CSV files require explicit geometry parameters passed as query params on the URL.

**XY coordinates:**

```rust
let url = Url::parse("file:///data/points.csv?x=lng&y=lat").unwrap();
let source = Source::from_url(url).unwrap();
```

**WKT geometry column:**

```rust
let url = Url::parse("file:///data/points.csv?wkt=geom").unwrap();
let source = Source::from_url(url).unwrap();
```

`x`/`y` and `wkt` are mutually exclusive — passing both returns an error.

### Parse CSV geometry params directly

```rust
use libsphere::csv::{CsvParams};
use libsphere::SphereUri;

let uri = SphereUri::parse("file:///data/points.csv?x=lng&y=lat").unwrap();
let params = CsvParams::from_uri(&uri).unwrap();

match params {
    CsvParams::XY { x, y } => println!("XY: {x}, {y}"),
    CsvParams::Wkt(field) => println!("WKT column: {field}"),
}
```

### Schema inference

```rust
let schema = source.get_schema().unwrap();
// schema.columns: HashMap<String, String> — column name → "String" | "Number" | "Mixed"
// schema.points_count, schema.lines_count, schema.polygons_count
```

### `SphereUri`

A thin wrapper around `url::Url` used to parse source URIs and extract query parameters.

```rust
use libsphere::SphereUri;

let uri = SphereUri::parse("file:///data/points.csv?wkt=geometry").unwrap();
let wkt = uri.query_param("wkt"); // Some("geometry")
```
