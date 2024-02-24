use csv;
use geo::BoundingRect;
use geojson::{Feature, FeatureCollection, Geometry, JsonObject, Position, Value};
use geozero::geojson::GeoJson;
use geozero::ToGeo;
use std::{collections::HashMap, fs::File, result};

use super::Bounds;

#[derive(Debug)]
pub enum CsvError {
    FS(std::io::Error),
    // Serialize,
}

impl From<std::io::Error> for CsvError {
    fn from(err: std::io::Error) -> Self {
        CsvError::FS(err)
    }
}

pub type Result<T> = result::Result<T, CsvError>;

#[derive(Debug)]
pub enum CsvGeometry {
    // WKT(String),
    XY((String, String)),
}

impl CsvGeometry {
    fn get_value(&self, record: &JsonObject) -> Option<Value> {
        match &self {
            CsvGeometry::XY((xfield, yfield)) => {
                let x = record
                    .get(xfield)
                    .map(|value| match value {
                        serde_json::Value::Number(n) => n.as_f64(),
                        serde_json::Value::String(s) => s.parse::<f64>().ok(),
                        _ => None,
                    })
                    .flatten();

                let y = record
                    .get(yfield)
                    .map(|value| match value {
                        serde_json::Value::Number(n) => n.as_f64(),
                        serde_json::Value::String(s) => s.parse::<f64>().ok(),
                        _ => None,
                    })
                    .flatten();

                let pos: Option<Position> = vec![x, y].into_iter().collect();
                pos.map(|pos| Value::Point(pos))
            } // CsvGeometry::WKT(_) => None,
        }
    }
}

#[derive(Debug)]
pub struct Csv {
    pub delimiter: String,
    pub geometry: CsvGeometry,
    pub path: String,
}

impl Bounds for Csv {
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

impl Csv {
    pub fn get_features(&self) -> Result<Vec<Feature>> {
        let file = File::open(self.path.as_str())?;

        // let mut rdr = csv::ReaderBuilder::new()
        // .has_headers(false)
        // .delimiter(b';')
        // .double_quote(false)
        // .escape(Some(b'\\'))
        // .flexible(true)
        // .comment(Some(b'#'))
        // .from_reader(io::stdin());
        let mut features = Vec::<Feature>::new();
        let mut rdr = csv::Reader::from_reader(file);
        for result in rdr.deserialize() {
            let record: JsonObject = result.unwrap();
            let geom = self.geometry.get_value(&record);
            match geom {
                Some(geom) => {
                    let geometry = Geometry::new(geom);
                    let feature = Feature {
                        bbox: None,
                        geometry: Some(geometry),
                        id: None,
                        properties: Some(record),
                        foreign_members: None,
                    };
                    features.push(feature);
                }
                None => {}
            };
        }

        Ok(features)
    }

    pub fn to_geojson(&self) -> Result<String> {
        let features = self.get_features()?;
        let fc = FeatureCollection {
            features,
            bbox: None,
            foreign_members: None,
        };
        Ok(fc.to_string())
    }

    pub fn get_schema(&self) -> Result<HashMap<String, String>> {
        let mut schema = HashMap::new();
        match self.get_features() {
            Ok(features) => {
                let x = features.into_iter().take(1).next().unwrap();
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
        }
        Ok(schema)
    }
}

#[cfg(test)]
mod tests {
    // use super::*;

    #[test]
    fn test_valid_jsonfile() {
        // let geojson = Csv {
        //     path: "./assets/geojson-files/ne_10m_airports.geojson".to_string(),
        // };
        // assert!(geojson.read().is_ok());
    }

    #[test]
    fn test_valid_bounds() {
        // let geojson = Csv {
        //     path: "./assets/geojson-files/ne_10m_airports.geojson".to_string(),
        // };
        // let bounds = geojson.get_bounds().unwrap_or_default();
        // assert!(bounds == (-175.135635, -53.7814746058316, 179.19544202302, 78.246717));
    }
}
