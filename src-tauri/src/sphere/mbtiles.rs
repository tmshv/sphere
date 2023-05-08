use crate::sphere::tilejson;
use flate2::read::{GzDecoder, ZlibDecoder};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io;
use std::io::Read;
use std::result::Result;

use super::tilejson::{MINZOOM, MAXZOOM};

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
    pub format: Option<String>,
    pub json: Option<Value>,
    pub mbtiles_type: Option<String>,
}

fn sphere_mbtile_url(path: &str) -> String {
    format!("sphere://mbtiles{}?z={{z}}&x={{x}}&y={{y}}", path)
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
                        format: None,
                        json: None,
                        mbtiles_type: None,
                    };
                    let mut tilejson = tilejson::Tilejson3::new();
                    let mut meta_rows = statement.query([]).unwrap();
                    let mut minzoom: i32 = MINZOOM;
                    let mut maxzoom: i32 = MAXZOOM;
                    while let Some(row) = meta_rows.next().unwrap() {
                        let key: String = row.get(0).unwrap();
                        let value: String = row.get(1).unwrap();
                        match key.as_ref() {
                            "name" => {
                                tilejson.set_name(value);
                            }
                            "description" => {
                                tilejson.set_description(value);
                            }
                            "version" => {
                                tilejson.set_version(value);
                            }
                            "attribution" => {
                                tilejson.set_attribution(value);
                            }
                            "legend" => {
                                tilejson.set_legend(value);
                            }
                            "template" => {
                                tilejson.set_template(value);
                            }
                            "bounds" => {
                                let bounds = value
                                    .split(',')
                                    .filter_map(|s| s.parse::<f32>().ok())
                                    .collect::<Vec<f32>>();
                                if bounds.len() == 4 {
                                    tilejson.set_bounds(bounds);
                                }
                            }
                            "center" => {
                                let coord = value
                                    .split(',')
                                    .filter_map(|s| s.parse::<f32>().ok())
                                    .collect::<Vec<f32>>();
                                if coord.len() == 2 || coord.len() == 3 {
                                    tilejson.set_center(coord);
                                }
                            }
                            "minzoom" => {
                                minzoom = match value.parse::<i32>() {
                                    Ok(value) => value,
                                    Err(_) => tilejson::MINZOOM,
                                }
                            }
                            "maxzoom" => {
                                maxzoom = match value.parse::<i32>() {
                                    Ok(value) => value,
                                    Err(_) => tilejson::MAXZOOM,
                                }
                            }
                            "type" => meta.mbtiles_type = Some(value),
                            "format" => meta.format = Some(value),
                            "json" => meta.json = Some(serde_json::from_str(&value).unwrap()),
                            &_ => {}
                        }
                    }
                    tilejson.set_zoom(minzoom, maxzoom);

                    let tiles = sphere_mbtile_url(path);
                    tilejson.add_tile(tiles);

                    let mut tj = tilejson.as_json();
                    match meta.json {
                        Some(json) => {
                            merge(&mut tj, json);
                        }
                        None => (),
                    }

                    let serialized = serde_json::to_string(&tj);
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
