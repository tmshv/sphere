use std::io;
use std::io::Read;
use std::result::Result;
use flate2::read::{GzDecoder, ZlibDecoder};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

fn merge(a: &mut Value, b: Value) {
    match (a, b) {
        (a @ &mut Value::Object(_), Value::Object(b)) => {
            let a = a.as_object_mut().unwrap();
            for (k, v) in b {
                merge(a.entry(k).or_insert(Value::Null), v);
            }
        }
        (a, b) => *a = b,
    }
}

pub enum TileFormat {
    Png,
    Jpg,
    Webp,
    Pbf,
    Gzip,
    Zlib,
}

fn unzip(data: Vec<u8>, data_type: TileFormat) -> io::Result<Vec<u8>> {
    match data_type {
        TileFormat::Gzip => {
            let mut decoder = GzDecoder::new(&data[..]);
            let mut s = Vec::new();
            decoder.read_to_end(&mut s)?;
            Ok(s)
        }
        TileFormat::Zlib => {
            let mut decoder = ZlibDecoder::new(&data[..]);
            let mut s = Vec::new();
            decoder.read_to_end(&mut s)?;
            Ok(s)
        }
        _ => Ok(data),
    }
}

fn get_tile_format(data: &[u8]) -> TileFormat {
    match data {
        v if &v[0..2] == b"\x1f\x8b" => TileFormat::Gzip,
        v if &v[0..2] == b"\x78\x9c" => TileFormat::Zlib,
        v if &v[0..8] == b"\x89\x50\x4E\x47\x0D\x0A\x1A\x0A" => TileFormat::Png,
        v if &v[0..3] == b"\xFF\xD8\xFF" => TileFormat::Jpg,
        v if &v[0..4] == b"RIFF" && &v[8..12] == b"WEBP" => TileFormat::Webp,
        _ => TileFormat::Pbf,
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Tile {
    pub x: i32,
    pub y: i32,
    pub zoom: i32,
}

impl Tile {
    fn as_tms(&self) -> (i32, i32, i32) {
        // Flip Y coordinate because MBTiles files are TMS.
        let y = (1 << self.zoom) - 1 - self.y;
        (self.zoom, self.x, y)
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MbtilesMetadata {
    pub tilejson: String,
    pub name: Option<String>,
    pub format: Option<String>,
    pub description: Option<String>,
    pub attribution: Option<String>,
    pub legend: Option<String>,
    pub template: Option<String>,
    pub version: Option<String>,
    pub minzoom: i32,
    pub maxzoom: i32,
    pub center: Option<Vec<f32>>,
    pub bounds: Option<Vec<f32>>,
    pub json: Option<Value>,
    pub mbtiles_type: Option<String>,
}

pub fn mbtiles_read_metadata(path: &str) -> Result<String, String> {
    let conn = Connection::open(path);
    match conn {
        Ok(conn) => {
            let statement = conn.prepare(
                r#"
                SELECT name, value
                FROM metadata
                WHERE value IS NOT NULL
                "#,
            );
            match statement {
                Ok(mut statement) => {
                    let mut meta = MbtilesMetadata {
                        tilejson: String::from("3.0.0"),
                        name: None,
                        format: None,
                        description: None,
                        attribution: None,
                        legend: None,
                        template: None,
                        version: None,
                        minzoom: 0,
                        maxzoom: 22,
                        center: None,
                        bounds: None,
                        json: None,
                        mbtiles_type: None,
                    };
                    let mut meta_rows = statement.query([]).unwrap();
                    while let Some(row) = meta_rows.next().unwrap() {
                        let key: String = row.get(0).unwrap();
                        let value: String = row.get(1).unwrap();
                        match key.as_ref() {
                            "name" => meta.name = Some(value),
                            "description" => meta.description = Some(value),
                            "version" => meta.version = Some(value),
                            "attribution" => meta.attribution = Some(value),
                            "bounds" => {
                                let bounds = value
                                    .split(',')
                                    .filter_map(|s| s.parse::<f32>().ok())
                                    .collect::<Vec<f32>>();
                                if bounds.len() == 4 {
                                    meta.bounds = Some(bounds)
                                }
                            }
                            "center" => {
                                let coord = value
                                    .split(',')
                                    .filter_map(|s| s.parse::<f32>().ok())
                                    .collect::<Vec<f32>>();
                                if coord.len() == 2 || coord.len() == 3 {
                                    meta.center = Some(coord)
                                }
                            }
                            "minzoom" => {
                                meta.minzoom = match value.parse::<i32>() {
                                    Ok(value) => value,
                                    Err(_) => 0,
                                }
                            }
                            "maxzoom" => {
                                meta.maxzoom = match value.parse::<i32>() {
                                    Ok(value) => value,
                                    Err(_) => 22,
                                }
                            }
                            "type" => meta.mbtiles_type = Some(value),
                            "format" => meta.format = Some(value),
                            "legend" => meta.legend = Some(value),
                            "template" => meta.template = Some(value),
                            "json" => meta.json = Some(serde_json::from_str(&value).unwrap()),
                            &_ => {}
                        }
                    }

                    let tiles = format!["sphere://mbtiles{}?z={{z}}&x={{x}}&y={{y}}", path];

                    let mut tilejson = json!({
                        // A semver.org style version number as a string.
                        // Describes the version of the TileJSON spec that is implemented by this JSON object.
                        "tilejson": meta.tilejson,

                        // An array of tile endpoints.
                        // {z}, {x} and {y}, if present, are replaced with the corresponding integers.
                        // If multiple endpoints are specified, clients may use any combination of endpoints.
                        // All endpoint urls MUST be absolute.
                        // All endpoints MUST return the same content for the same URL.
                        // The array MUST contain at least one endpoint.
                        // The tile extension is NOT limited to any particular format.
                        // Some of the more popular are: mvt, vector.pbf, png, webp, and jpg.
                        "tiles": vec![tiles],

                        // An array of objects.
                        // Each object describes one layer of vector tile data.
                        // A vector_layer object MUST contain the id and fields keys, and MAY contain the description, minzoom, or maxzoom keys.
                        // An implemenntation MAY include arbitrary keys in the object outside of those defined in this specification.
                        // Note: When describinng a set of raster tiles or other tile format that does not have a "layers" concept (i.e. "format": "jpeg"),
                        // the vector_layers key is not required.
                        // Note: Will be added on merge step.
                        // "vector_layers": vec![],

                        // Contains an attribution to be displayed when the map is shown to a user.
                        // Implementations MAY decide to treat this as HTML or literal text.
                        // For security reasons, make absolutely sure that this content can't be abused as a vector for XSS or beacon tracking.
                        "attribution": meta.attribution,

                        // The maximum extent of available map tiles.
                        // Bounds MUST define an area covered by all zoom levels.
                        // The bounds are represented in WGS 84 latitude and longitude values, in the order left, bottom, right, top.
                        // Values may be integers or floating point numbers.
                        // The minimum/maximum values for longitude and latitude are -180/180 and -90/90 respectively.
                        // Bounds MUST NOT "wrap" around the ante-meridian.
                        // If bounds are not present, the default value MAY assume the set of tiles is globally distributed.
                        // Default: [ -180, -85.05112877980659, 180, 85.0511287798066 ] (xyz-compliant tile bounds)
                        "bounds": meta.bounds,

                        // The first value is the longitude, the second is latitude (both in WGS:84 values), the third value is the zoom level as an integer.
                        // Longitude and latitude MUST be within the specified bounds.
                        // The zoom level MUST be between minzoom and maxzoom.
                        // Implementations MAY use this center value to set the default location.
                        // If the value is null, implementations MAY use their own algorithm for determining a default location.
                        "center": meta.center,

                        // TODO Not implemented
                        // An array of data files in GeoJSON format.
                        // {z}, {x} and {y}, if present, are replaced with the corresponding integers.
                        // If multiple endpoints are specified, clients may use any combination of endpoints.
                        // All endpoints MUST return the same content for the same URL.
                        // If the array doesn't contain any entries, then no data is present in the map.
                        // This field is for overlaying GeoJSON data on tiled raster maps and is generally no longer used for GL-based maps.
                        // "data": vec![],

                        // A text description of the set of tiles.
                        // The description can contain any valid unicode character as described by the JSON specification RFC 8259
                        // (https://tools.ietf.org/html/rfc8259).
                        "description": meta.description,

                        // TODO Not implemented
                        // An integer specifying the zoom level from which to generate overzoomed tiles.
                        // Implementations MAY generate overzoomed tiles from parent tiles if the requested zoom level does not exist.
                        // In most cases, overzoomed tiles are generated from the maximum zoom level of the set of tiles.
                        // If fillzoom is specified, the overzoomed tile MAY be generated from the fillzoom level.
                        // For example, in a set of tiles with maxzoom 10 and no fillzoom specified,
                        // a request for a z11 tile will use the z10 parent tiles to generate the new, overzoomed z11 tile.
                        // If the same TileJSON object had fillzoom specified at z7, a request for a z11 tile would use the z7 tile instead of z10.
                        // While TileJSON may specify rules for overzooming tiles,
                        // it is ultimately up to the tile serving client or renderer to implement overzooming.
                        // "fillzoom": 0,

                        // TODO Not implemented
                        // An array of interactivity endpoints.
                        // {z}, {x} and {y}, if present, are replaced with the corresponding integers.
                        // If multiple endpoints are specified, clients may use any combination of endpoints.
                        // All endpoints MUST return the same content for the same URL.
                        // If the array doesn't contain any entries, UTF-Grid interactivity is not supported for this set of tiles.
                        // See https://github.com/mapbox/utfgrid-spec/tree/master/1.2 for the interactivity specification.
                        // Note: UTF-Grid interactivity predates GL-based map rendering and interaction.
                        // Map interactivity is now generally defined outside of the TileJSON specification and is dependent on the tile rendering library's features.
                        // "grids": []

                        // Contains a legend to be displayed with the map.
                        // Implementations MAY decide to treat this as HTML or literal text.
                        // For security reasons, make absolutely sure that this field can't be abused as a vector for XSS or beacon tracking.
                        "legend": meta.legend,

                        // TODO Add checks according to this spec
                        // An integer specifying the maximum zoom level.
                        // MUST be in range: 0 <= minzoom <= maxzoom <= 30.
                        // A client or server MAY request tiles outside of the zoom range,
                        // but the availability of these tiles is dependent on how the the tile server or renderer handles the request (such as overzooming tiles).
                        "maxzoom": meta.maxzoom,

                        // TODO Add checks according to this spec
                        // An integer specifying the minimum zoom level.
                        // MUST be in range: 0 <= minzoom <= maxzoom <= 30.
                        "minzoom": meta.minzoom,

                        // A name describing the set of tiles.
                        // The name can contain any legal character.
                        // Implementations SHOULD NOT interpret the name as HTML.
                        "name": meta.name,

                        // Either "xyz" or "tms".
                        // Influences the y direction of the tile coordinates.
                        // The global-mercator (aka Spherical Mercator) profile is assumed.
                        "scheme": "xyz",

                        // Contains a mustache template to be used to format data from grids for interaction.
                        // See https://github.com/mapbox/utfgrid-spec/tree/master/1.2 for the interactivity specification.
                        // Example: "{{#__teaser__}}{{NAME}}{{/__teaser__}}"
                        "template": meta.template,

                        // A semver.org style version number of the tiles.
                        // When changes across tiles are introduced the minor version MUST change.
                        // This may lead to cut off labels.
                        // Therefore, implementors can decide to clean their cache when the minor version changes.
                        // Changes to the patch level MUST only have changes to tiles that are contained within one tile.
                        // When tiles change significantly, such as updating a vector tile layer name, the major version MUST be increased.
                        // Implementations MUST NOT use tiles with different major versions.
                        "version": meta.version,
                    });

                    match meta.json {
                        Some(json) => {
                            merge(&mut tilejson, json);
                        }
                        None => (),
                    }

                    let serialized = serde_json::to_string(&tilejson);
                    match serialized {
                        Ok(data) => Ok(data),
                        Err(_) => Err("Failed to serialize TileJSON".into()),
                    }
                }
                Err(_) => Err("Failed to query".into()),
            }
        }
        Err(_) => Err("Failed to create SQL connection".into()),
    }
}

pub fn mbtiles_read_tile(path: &str, tile: &Tile) -> Option<Vec<u8>> {
    let conn = Connection::open(path).unwrap();
    let statement = conn.prepare(
        r#"
            SELECT tile_data
            FROM tiles
            WHERE 1=1
            AND zoom_level = ?1
            AND tile_column = ?2
            AND tile_row = ?3
        "#,
    );
    let tile_bytes = match statement {
        Ok(mut statement) => {
            let (z, x, y) = tile.as_tms();
            let res: Option<Vec<u8>> =
                match statement.query_row(params![z, x, y], |row| Ok(row.get(0).unwrap())) {
                    Ok(data) => Some(data),
                    Err(err) => {
                        println!("Failed to get SQL row: {}", err);
                        None
                    }
                };
            res
        }
        Err(err) => {
            println!("Failed to create SQL query: {}", err);
            None
        }
    };

    match tile_bytes {
        Some(bytes) => {
            let f = get_tile_format(bytes.as_slice());
            match f {
                TileFormat::Zlib => {
                    let t = unzip(bytes, TileFormat::Zlib).unwrap();
                    return Some(t);
                }
                TileFormat::Gzip => {
                    let t = unzip(bytes, TileFormat::Gzip).unwrap();
                    return Some(t);
                }
                _ => return Some(bytes),
            }
        }
        None => None,
    }
}
