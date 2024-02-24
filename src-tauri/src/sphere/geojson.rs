use geo::BoundingRect;
use geojson::GeoJson as GeoJson2;
use geozero::geojson::GeoJson;
use geozero::ToGeo;
use std::collections::HashMap;
use std::io::prelude::*;
use std::{fs::File, result};

use super::Bounds;

#[derive(Debug)]
pub enum GeojsonError {
    FS(std::io::Error),
    // Serialize,
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

        // let geojson = contents.parse::<geojson::GeoJson>().unwrap();

        Ok(contents)
    }

    pub fn get_schema(&self) -> Result<HashMap<String, String>> {
        let mut schema = HashMap::<String, String>::new();
        match self.read() {
            Ok(geojson_str) => {
                let geojson = geojson_str.parse::<GeoJson2>().unwrap();
                match geojson {
                    GeoJson2::FeatureCollection(val) => {
                        let x = val.features.into_iter().take(1).next().unwrap();
                        let p = x.properties.unwrap();
                        p.keys().for_each(|k| {
                            let val = p.get(k).unwrap();
                            match val {
                                serde_json::Value::String(_) => schema.insert(k.clone(), "String".into()),
                                serde_json::Value::Number(_) => schema.insert(k.clone(), "Number".into()),
                                _ => schema.insert(k.clone(), "Mixed".into()),
                            };
                        });
                    }
                    _ => {}
                };
            }
            Err(err) => {}
        };
        Ok(schema)
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
