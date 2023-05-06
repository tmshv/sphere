use std::io::{Result, Read};

use rusqlite::{params, Connection};
use flate2::read::{GzDecoder, ZlibDecoder};
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
    Gzip,
    Zlib,
}

fn unzip(data: Vec<u8>, data_type: TileFormat) -> Result<Vec<u8>> {
    match data_type {
        TileFormat::Gzip => {
            let mut decoder = GzDecoder::new(&data[..]);
            let mut s = Vec::new();
            decoder.read_to_end(&mut s).unwrap();
            Ok(s)
        }
        TileFormat::Zlib => {
            let mut decoder = ZlibDecoder::new(&data[..]);
            let mut s = Vec::new();
            decoder.read_to_end(&mut s).unwrap();
            Ok(s)
        }
        _ => Ok(data),
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Tile {
    pub x: i32,
    pub y: i32,
    pub zoom: i32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MbtilesMetadata {
    pub tilejson: String,
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub attribution: Option<String>,
    pub version: Option<String>,
    pub minzoom: i32,
    pub maxzoom: i32,
    pub center: Option<Vec<f32>>,
    pub bounds: Option<Vec<f32>>,
    pub json: Option<Value>,
}

pub fn mbtiles_read_metadata(path: &str) -> String {
    let mut meta = MbtilesMetadata {
        tilejson: String::from("2.0.0"),
        id: String::from(path),
        name: None,
        description: None,
        attribution: None,
        version: None,
        minzoom: 0,
        maxzoom: 22,
        center: None,
        bounds: None,
        json: None,
    };
    let conn = Connection::open(path).unwrap();

    let mut statement = conn
        .prepare(
            r#"
            SELECT name, value
            FROM metadata
            WHERE value IS NOT NULL
            "#,
        )
        .unwrap();

    let mut metadata_rows = statement.query([]).unwrap();
    while let Some(row) = metadata_rows.next().unwrap() {
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
                if coord.len() == 2 {
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
            // "type" => metadata.layer_type = Some(value),
            // "legend" => metadata.legend = Some(value),
            // "template" => metadata.template = Some(value),
            "json" => meta.json = Some(serde_json::from_str(&value).unwrap()),
            // &_ => result = String::from("not_name"),
            &_ => {}
        }
    }

    println!("mbtile meta was invoked from js with result: {:?}", meta);

    let tiles = format!["sphere://mbtiles{}?z={{z}}&x={{x}}&y={{y}}", path];

    let mut tilejson = json!({
        "tilejson": meta.tilejson,
        "id": meta.id,
        "name": meta.name,
        "description": meta.description,
        "attribution": meta.attribution,
        "version": meta.version,
        "minzoom": meta.minzoom,
        "maxzoom": meta.maxzoom,
        "center": meta.center,
        "bounds": meta.bounds,
        "tiles": vec![tiles],
    });

    match meta.json {
        Some(json) => {
            merge(&mut tilejson, json);
        }
        None => (),
    }

    let serialized = serde_json::to_string(&tilejson).unwrap();
    serialized
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
            let y = (1 << tile.zoom) - 1 - tile.y;
            let res: Option<Vec<u8>> = match statement
                .query_row(params![tile.zoom, tile.x, y], |row| {
                    Ok(row.get(0).unwrap())
                }) {
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
            let t = unzip(bytes, TileFormat::Gzip).unwrap();
            return Some(t)
        }
        None => None
    }
}
