use csv;
use geojson::{Feature, FeatureCollection, Geometry, JsonObject, Value};
use geo::BoundingRect;
use geozero::geojson::GeoJson;
use std::{fs::File, result};
use geozero::ToGeo;

use super::Bounds;

#[derive(Debug)]
pub enum CsvError {
    FS(std::io::Error),
    Serialize,
}

impl From<std::io::Error> for CsvError {
    fn from(err: std::io::Error) -> Self {
        CsvError::FS(err)
    }
}

pub type Result<T> = result::Result<T, CsvError>;

#[derive(Debug)]
pub enum CsvGeometry {
    WKT(String),
    XY((String, String)),
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
    pub fn to_geojson(&self) -> Result<String> {
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

            let p = match &self.geometry {
                CsvGeometry::XY((xfield, yfield)) => {
                    let x = match record.get(xfield).unwrap() {
                        serde_json::Value::Number(n) => n.as_f64(),
                        serde_json::Value::String(s) => s.parse::<f64>().ok(),
                        _ => Some(0.0),
                    };
                    let y = match record.get(yfield).unwrap() {
                        serde_json::Value::Number(n) => n.as_f64(),
                        serde_json::Value::String(s) => s.parse::<f64>().ok(),
                        _ => Some(0.0),
                    };
                    match (x, y) {
                        (Some(x), Some(y)) => Some(Value::Point(vec![x, y])),
                        _ => None,
                    }
                }
                CsvGeometry::WKT(col) => None,
            };

            match p {
                Some(point) => {
                    let geometry = Geometry::new(point);
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

        let fc = FeatureCollection{
            features,
            bbox: None,
            foreign_members: None,
        };

        Ok(fc.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
