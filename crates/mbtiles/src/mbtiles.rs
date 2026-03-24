use crate::{
    archive::unzip_tile,
    merge::merge,
    tile::Tile,
    tileformat::{get_tile_format, TileFormat},
};
use rusqlite::{params, Connection, Error as RusqliteError};
use serde::{Deserialize, Serialize};
use serde_json::{Error as SerdeError, Value};
use std::result;
use tilejson::{TileScheme, Tilejson3, MAXZOOM, MINZOOM};

#[derive(Debug)]
pub enum MBTilesError {
    // DB(RusqliteError),
    DB,
    // Serialize(SerdeError),
    Serialize,
    // Unknown,
}

impl From<RusqliteError> for MBTilesError {
    // fn from(err: RusqliteError) -> Self {
    fn from(_: RusqliteError) -> Self {
        // MbtilesError::DB(err)
        MBTilesError::DB
    }
}

impl From<SerdeError> for MBTilesError {
    // fn from(err: SerdeError) -> Self {
    fn from(_: SerdeError) -> Self {
        // MbtilesError::Serialize(err)
        MBTilesError::Serialize
    }
}

pub type Result<T> = result::Result<T, MBTilesError>;

#[derive(Serialize, Deserialize, Debug)]
pub struct MBTilesMetadata {
    pub format: Option<String>,
    pub json: Option<Value>,
    pub mbtiles_type: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MBTiles {
    pub source: String,
    pub path: String,
}

impl MBTiles {
    pub fn get_tilejson(&self) -> Result<Value> {
        let conn = Connection::open(self.path.as_str())?;
        let mut statement = conn.prepare(
            r#"
            SELECT name, value
            FROM metadata
            WHERE value IS NOT NULL
            "#,
        )?;
        let mut meta = MBTilesMetadata {
            format: None,
            json: None,
            mbtiles_type: None,
        };
        let mut tilejson = Tilejson3::new();
        let mut meta_rows = statement.query([])?;
        let mut minzoom: i32 = MINZOOM;
        let mut maxzoom: i32 = MAXZOOM;
        while let Some(row) = meta_rows.next()? {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;
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
                "scheme" => {
                    let scheme = TileScheme::from_str(value.as_str());
                    match scheme {
                        Some(value) => {
                            tilejson.set_scheme(value);
                        }
                        None => (),
                    }
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
                "json" => meta.json = Some(serde_json::from_str(&value)?),
                &_ => {}
            }
        }
        let normalized_format = meta.format.map(|fmt| {
            if fmt == "jpeg" { "jpg".to_string() } else { fmt }
        });
        if let Some(ref fmt) = normalized_format {
            tilejson.set_format(fmt.clone());
        }
        tilejson.set_zoom(minzoom, maxzoom);
        tilejson.add_tile(self.source.clone());

        let mut result = tilejson.as_json();
        match meta.json {
            Some(json) => {
                merge(&mut result, json);
            }
            None => (),
        };
        // Normalize format in merged result: covers format from metadata table and json blob.
        // Re-applying also prevents json metadata blob from overwriting the normalized value.
        if let Some(obj) = result.as_object_mut() {
            if let Some(serde_json::Value::String(fmt)) = obj.get("format") {
                let normalized = if fmt == "jpeg" { "jpg".to_string() } else { fmt.clone() };
                obj.insert("format".to_string(), serde_json::Value::String(normalized));
            }
        }
        Ok(result)
    }

    pub fn get_tile(&self, tile: &Tile) -> Result<Vec<u8>> {
        let conn = Connection::open(self.path.as_str())?;
        let mut statement = conn.prepare(
            r#"
            SELECT tile_data
            FROM tiles
            WHERE 1=1
            AND zoom_level = ?1
            AND tile_column = ?2
            AND tile_row = ?3
            "#,
        )?;
        let (z, x, y) = tile.as_tms();
        let tile_bytes: Vec<u8> =
            statement.query_row(params![z, x, y], |row| Ok(row.get(0).unwrap()))?;
        let f = get_tile_format(tile_bytes.as_slice());
        match f {
            TileFormat::Zlib => {
                let t = unzip_tile(tile_bytes, TileFormat::Zlib).unwrap();
                Ok(t)
            }
            TileFormat::Gzip => {
                let t = unzip_tile(tile_bytes, TileFormat::Gzip).unwrap();
                Ok(t)
            }
            _ => Ok(tile_bytes),
        }
    }
}
