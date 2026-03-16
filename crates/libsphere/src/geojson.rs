use geo::BoundingRect;
use geojson::GeoJson as GeoJson2;
use geozero::geojson::GeoJson;
use geozero::ToGeo;
use std::collections::HashMap;
use std::io::prelude::*;
use std::{fs::File, result};

use super::Bounds;
use crate::schema::{infer_source_schema, SourceSchema};

#[derive(Debug)]
pub enum GeojsonError {
    // FS(std::io::Error),
    FS,
    // Serialize,
}

impl From<std::io::Error> for GeojsonError {
    // fn from(err: std::io::Error) -> Self {
    fn from(_: std::io::Error) -> Self {
        // GeojsonError::FS(err)
        GeojsonError::FS
    }
}

pub type Result<T> = result::Result<T, GeojsonError>;

#[derive(Debug)]
pub struct Geojson {
    pub path: String,
}

impl Bounds for Geojson {
    fn get_bounds(&self) -> Option<(f64, f64, f64, f64)> {
        match self.read() {
            Ok(geojson_str) => {
                let geojson = GeoJson(geojson_str.as_str());
                let b = geojson.to_geo().ok()?;
                let bounds = b.bounding_rect()?;
                let min = bounds.min();
                let max = bounds.max();
                Some((min.x, min.y, max.x, max.y))
            }
            Err(err) => {
                println!("{:?}", err);
                None
            }
        }
    }
}

impl Geojson {
    pub fn read(&self) -> Result<String> {
        let mut file = File::open(self.path.as_str())?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;

        // let geojson = contents.parse::<geojson::GeoJson>().unwrap();

        Ok(contents)
    }

    pub fn get_schema(&self) -> Result<SourceSchema> {
        let geojson_str = self.read()?;
        let geojson = geojson_str.parse::<GeoJson2>().map_err(|_| GeojsonError::FS)?;
        if let GeoJson2::FeatureCollection(val) = geojson {
            return Ok(infer_source_schema(val.features.iter()));
        }
        Ok(SourceSchema {
            columns: HashMap::new(),
            points_count: 0,
            lines_count: 0,
            polygons_count: 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_jsonfile() {
        let geojson = Geojson {
            path: "./assets/geojson-files/ne_10m_airports.geojson".to_string(),
        };
        assert!(geojson.read().is_ok());
    }

    #[test]
    fn test_valid_bounds() {
        let geojson = Geojson {
            path: "./assets/geojson-files/ne_10m_airports.geojson".to_string(),
        };
        let bounds = geojson.get_bounds().unwrap_or_default();
        assert!(bounds == (-175.135635, -53.7814746058316, 179.19544202302, 78.246717));
    }
}
