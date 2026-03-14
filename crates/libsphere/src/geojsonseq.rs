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
use crate::schema::{infer_source_schema, SourceSchema};

// Read more about this delimiter
// https://datatracker.ietf.org/doc/html/rfc8142
const RS: u8 = b'\x1e';

enum JSONStreamType {
    Ndjson,
    JSONSeq,
}

#[derive(Debug)]
pub struct GeojsonSeq {
    pub path: String,
}

impl Bounds for GeojsonSeq {
    fn get_bounds(&self) -> Option<(f64, f64, f64, f64)> {
        match self.to_geojson() {
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

impl GeojsonSeq {
    fn get_stream_type(&self) -> Result<JSONStreamType> {
        let mut file = File::open(self.path.clone())?;
        let mut head = [0u8; 1];
        let _ = file.read(&mut head);
        match head[0] {
            RS => Ok(JSONStreamType::JSONSeq),
            _ => Ok(JSONStreamType::Ndjson),
        }
    }

    fn geojsonseq_to_geojson<P: AsRef<Path>>(&self, path: P) -> Result<String> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let mut features = Vec::new();
        for chunk in reader.split(RS) {
            let chunk = chunk?;
            if chunk.is_empty() {
                continue;
            }
            let feature = String::from_utf8(chunk).map_err(|_| GeojsonError::FS)?;
            let feature: Value = serde_json::from_str(&feature).map_err(|_| GeojsonError::FS)?;
            features.push(feature);
        }
        let feature_collection = serde_json::json!({
            "type": "FeatureCollection",
            "features": features,
        });
        serde_json::to_string(&feature_collection).map_err(|_| GeojsonError::FS)
    }

    fn geojsonl_to_geojson<P: AsRef<Path>>(&self, path: P) -> Result<String> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let mut features = Vec::new();
        for line in reader.lines() {
            let line = line?;
            let feature: Value = serde_json::from_str(&line).map_err(|_| GeojsonError::FS)?;
            features.push(feature);
        }
        let feature_collection = serde_json::json!({
            "type": "FeatureCollection",
            "features": features,
        });
        serde_json::to_string(&feature_collection).map_err(|_| GeojsonError::FS)
    }

    pub fn to_geojson(&self) -> Result<String> {
        match self.get_stream_type() {
            Ok(JSONStreamType::Ndjson) => self.geojsonl_to_geojson(self.path.as_str()),
            Ok(JSONStreamType::JSONSeq) => self.geojsonseq_to_geojson(self.path.as_str()),
            Err(_) => Err(GeojsonError::FS),
        }
    }

    pub fn get_schema(&self) -> Result<SourceSchema> {
        let geojson_str = self.to_geojson()?;
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
    fn test_valid_geojsonseq() {
        let val = GeojsonSeq {
            path: "./assets/geojson-files/osm-countries.geojsonl".to_string(),
        };
        assert!(val.to_geojson().is_ok());
    }

    #[test]
    fn test_valid_geojson() {
        let val = GeojsonSeq {
            path: "./assets/geojson-files/ne_10m_airports.geojsonl".to_string(),
        };
        assert!(val.to_geojson().is_ok());
    }

    #[test]
    fn test_valid_bounds() {
        let val = GeojsonSeq {
            path: "./assets/geojson-files/osm-countries.geojsonl".to_string(),
        };
        let bounds = val.get_bounds().unwrap_or_default();
        assert!(bounds == (-175.202642, -54.8432857, 179.0122737, 77.6192349));
    }
}
