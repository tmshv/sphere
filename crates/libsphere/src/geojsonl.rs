use geo::BoundingRect;
use geojson::GeoJson as GeoJson2;
use geozero::geojson::GeoJson;
use geozero::ToGeo;
use serde_json::Value;
use std::collections::HashMap;
use std::fs::File;
use std::io::{prelude::*, BufReader};
use std::path::Path;

use super::Bounds;
use crate::geojson::{GeojsonError, Result};

// Read more about this delimiter
// https://datatracker.ietf.org/doc/html/rfc8142
const RS: u8 = b'\x1e';

enum JSONStreamType {
    NDJSON,
    JSONSeq,
}

#[derive(Debug)]
pub struct Geojsonl {
    pub path: String,
}

impl Bounds for Geojsonl {
    fn get_bounds(&self) -> Option<(f64, f64, f64, f64)> {
        match self.to_geojson() {
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

impl Geojsonl {
    fn get_stream_type(&self) -> Result<JSONStreamType> {
        let mut file = File::open(self.path.clone())?;
        let mut head = [0u8; 1];
        let _ = file.read(&mut head);
        match head[0] {
            RS => Ok(JSONStreamType::JSONSeq),
            _ => Ok(JSONStreamType::NDJSON),
        }
    }

    fn geojsonseq_to_geojson<P: AsRef<Path>>(&self, path: P) -> Result<String> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let mut features = Vec::new();
        for chunk in reader.split(RS) {
            let chunk = chunk?;
            if chunk.len() < 1 {
                continue;
            }
            let feature = String::from_utf8(chunk).unwrap();
            let feature: Value = serde_json::from_str(&feature).unwrap();
            features.push(feature);
        }
        let feature_collection = serde_json::json!({
            "type": "FeatureCollection",
            "features": features,
        });
        let result = serde_json::to_string(&feature_collection);
        Ok(result.unwrap())
    }

    fn geojsonl_to_geojson<P: AsRef<Path>>(&self, path: P) -> Result<String> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let mut features = Vec::new();
        for line in reader.lines() {
            let line = line?;
            let feature: Value = serde_json::from_str(&line).unwrap();
            features.push(feature);
        }
        let feature_collection = serde_json::json!({
            "type": "FeatureCollection",
            "features": features,
        });
        let result = serde_json::to_string(&feature_collection);
        // match result {
        //     Ok(result) => Ok(result),
        //     Err(err) => GeojsonError::FS(err),
        // }
        Ok(result.unwrap())
    }

    pub fn to_geojson(&self) -> Result<String> {
        match self.get_stream_type() {
            Ok(JSONStreamType::NDJSON) => self.geojsonl_to_geojson(self.path.as_str()),
            Ok(JSONStreamType::JSONSeq) => self.geojsonseq_to_geojson(self.path.as_str()),
            Err(_) => Err(GeojsonError::FS),
        }
    }

    pub fn get_schema(&self) -> Result<HashMap<String, String>> {
        let mut schema = HashMap::<String, String>::new();
        match self.to_geojson() {
            Ok(geojson_str) => {
                let geojson = geojson_str.parse::<GeoJson2>().unwrap();
                match geojson {
                    GeoJson2::FeatureCollection(val) => {
                        let x = val.features.into_iter().take(1).next().unwrap();
                        let p = x.properties.unwrap();
                        p.keys().for_each(|k| {
                            let val = p.get(k).unwrap();
                            match val {
                                serde_json::Value::String(_) => {
                                    schema.insert(k.clone(), "String".into())
                                }
                                serde_json::Value::Number(_) => {
                                    schema.insert(k.clone(), "Number".into())
                                }
                                _ => schema.insert(k.clone(), "Mixed".into()),
                            };
                        });
                    }
                    _ => {}
                };
            }
            Err(_) => {}
        };
        Ok(schema)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_geojsonseq() {
        let val = Geojsonl {
            path: "./assets/geojson-files/osm-countries.geojsonl".to_string(),
        };
        assert!(val.to_geojson().is_ok());
    }

    #[test]
    fn test_valid_geojson() {
        let val = Geojsonl {
            path: "./assets/geojson-files/ne_10m_airports.geojsonl".to_string(),
        };
        assert!(val.to_geojson().is_ok());
    }

    #[test]
    fn test_valid_bounds() {
        let val = Geojsonl {
            path: "./assets/geojson-files/osm-countries.geojsonl".to_string(),
        };
        let bounds = val.get_bounds().unwrap_or_default();
        assert!(bounds == (-175.202642, -54.8432857, 179.0122737, 77.6192349));
    }
}
