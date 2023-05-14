use geo::BoundingRect;
use geozero::ToGeo;
use geozero::geojson::GeoJson;
use std::io::prelude::*;
use std::{fs::File, result};

use super::Bounds;

#[derive(Debug)]
pub enum GeojsonError {
    FS(std::io::Error),
    Serialize,
}

impl From<std::io::Error> for GeojsonError {
    fn from(err: std::io::Error) -> Self {
        GeojsonError::FS(err)
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
                let b = geojson.to_geo().unwrap();
                let bounds = b.bounding_rect().unwrap();

                // assert_eq!(40.02f64, bounding_rect.min().x);
                // assert_eq!(42.02f64, bounding_rect.max().x);
                // assert_eq!(116.34, bounding_rect.min().y);
                // assert_eq!(118.34, bounding_rect.max().y);

                let min = bounds.min();
                let max = bounds.max();
                let bounds = (min.x, min.y, max.x, max.y);
                Some(bounds)
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
        Ok(contents)
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
}
