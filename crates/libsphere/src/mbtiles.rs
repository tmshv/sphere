use mbtiles::{
    mbtiles::MBTiles,
    tile::Tile,
};
use crate::error::{Result, SphereError};

fn sphere_url(name: &str) -> String {
    format!("sphere://{name}/tile?z={{z}}&x={{x}}&y={{y}}")
}

#[derive(Debug, Clone)]
pub struct Tiles {
    pub name: String,
    mbtiles: MBTiles,
}

impl Tiles {
    /// Opens the MBTiles database, keeping the connection for the lifetime of the source.
    pub fn new(name: String, path: String) -> Result<Tiles> {
        let mbtiles = MBTiles::open(sphere_url(name.as_str()), path.clone())
            .map_err(|e| SphereError::Mbtiles { path, detail: e.to_string() })?;
        Ok(Tiles { name, mbtiles })
    }

    pub fn get_metadata(&self) -> Result<String> {
        let tj = self.mbtiles.get_tilejson().map_err(|e| SphereError::Mbtiles {
            path: self.mbtiles.path.clone(),
            detail: e.to_string(),
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
            detail: e.to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &str = "./assets/mbtiles/test.mbtiles";

    #[test]
    fn sphere_url_is_a_tile_template_for_the_source_name() {
        assert_eq!(
            sphere_url("basemap"),
            "sphere://basemap/tile?z={z}&x={x}&y={y}"
        );
    }

    #[test]
    fn get_metadata_serializes_tilejson_pointing_at_the_sphere_url() {
        let tiles = Tiles::new("basemap".to_string(), FIXTURE.to_string()).expect("open fixture");

        let meta = tiles.get_metadata().expect("metadata");

        let json: serde_json::Value = serde_json::from_str(&meta).expect("valid json");
        assert_eq!(json["name"], serde_json::Value::from("Sphere Test"));
        assert_eq!(json["format"], serde_json::Value::from("pbf"));
        assert_eq!(json["maxzoom"], serde_json::Value::from(2));
        assert_eq!(
            json["tiles"][0],
            serde_json::Value::from("sphere://basemap/tile?z={z}&x={x}&y={y}")
        );
        // The `json` metadata blob is merged into the result.
        assert_eq!(json["vector_layers"][0]["id"], serde_json::Value::from("places"));
    }

    #[test]
    fn get_tile_serves_repeated_requests_from_one_reader() {
        let tiles = Tiles::new("basemap".to_string(), FIXTURE.to_string()).expect("open fixture");

        // XYZ (1, 0) at zoom 1 is the TMS row 1 stored in the fixture.
        for tile in [Tile { zoom: 0, x: 0, y: 0 }, Tile { zoom: 1, x: 1, y: 0 }] {
            let data = tiles.get_tile(&tile).expect("tile found");
            assert_eq!(data, b"sphere-test-vector-tile");
        }
    }

    #[test]
    fn get_tile_reports_the_path_for_a_missing_tile() {
        let tiles = Tiles::new("basemap".to_string(), FIXTURE.to_string()).expect("open fixture");

        let err = tiles
            .get_tile(&Tile { zoom: 9, x: 9, y: 9 })
            .expect_err("no such tile");

        assert!(err.to_string().contains("test.mbtiles"), "got: {}", err);
    }

    #[test]
    fn new_reports_the_path_when_the_file_cannot_be_opened() {
        let path = "/nonexistent/sphere-test.mbtiles".to_string();

        let err = Tiles::new("basemap".to_string(), path.clone())
            .expect_err("missing file must not open");

        match err {
            SphereError::Mbtiles { path: reported, .. } => assert_eq!(reported, path),
            other => panic!("expected an Mbtiles error, got {:?}", other),
        }
    }
}
