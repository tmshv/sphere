use mbtiles::{
    mbtiles::{MBTiles, Result},
    tile::Tile,
};
use serde::{Deserialize, Serialize};

fn sphere_url(name: &str) -> String {
    format!("sphere://mbtiles/{}?z={{z}}&x={{x}}&y={{y}}", name)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Tiles {
    pub name: String,
    mbtiles: MBTiles,
}

impl Tiles {
    pub fn new(name: String, path: String) -> Tiles {
        let mbtiles = MBTiles {
            path: path,
            source: sphere_url(name.as_str()),
        };
        Tiles { name, mbtiles }
    }

    pub fn get_metadata(&self) -> Result<String> {
        let tj = self.mbtiles.get_tilejson()?;
        let serialized = serde_json::to_string(&tj)?;
        Ok(serialized)
    }

    pub fn get_tile(&self, tile: &Tile) -> Result<Vec<u8>> {
        self.mbtiles.get_tile(tile)
    }
}
