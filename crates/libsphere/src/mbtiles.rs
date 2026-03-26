use mbtiles::{
    mbtiles::MBTiles,
    tile::Tile,
};
use serde::{Deserialize, Serialize};

use crate::error::{Result, SphereError};

fn sphere_url(name: &str) -> String {
    format!("sphere://{name}/tile?z={{z}}&x={{x}}&y={{y}}")
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Tiles {
    pub name: String,
    mbtiles: MBTiles,
}

impl Tiles {
    pub fn new(name: String, path: String) -> Tiles {
        let mbtiles = MBTiles {
            path,
            source: sphere_url(name.as_str()),
        };
        Tiles { name, mbtiles }
    }

    pub fn get_metadata(&self) -> Result<String> {
        let tj = self.mbtiles.get_tilejson().map_err(|e| SphereError::Mbtiles {
            path: self.mbtiles.path.clone(),
            detail: format!("{:?}", e),
        })?;
        let serialized = serde_json::to_string(&tj).map_err(|e| SphereError::Mbtiles {
            path: self.mbtiles.path.clone(),
            detail: e.to_string(),
        })?;
        Ok(serialized)
    }

    pub fn get_tile(&self, tile: &Tile) -> Result<Vec<u8>> {
        self.mbtiles.get_tile(tile).map_err(|e| SphereError::Mbtiles {
            path: self.mbtiles.path.clone(),
            detail: format!("{:?}", e),
        })
    }
}
