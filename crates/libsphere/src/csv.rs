use csv;
use geo::BoundingRect;
use geojson::{Feature, FeatureCollection, Geometry, JsonObject, Position, Value};
use geozero::geojson::GeoJson;
use geozero::ToGeo;
use std::{fs::File, str::FromStr};

use super::Bounds;
use crate::error::{Result, SphereError, WithPath};
use crate::schema::{infer_source_schema, SourceSchema};
use crate::SphereUri;

#[derive(Debug)]
pub enum CsvParams {
    XY { x: String, y: String },
    Wkt(String),
}

impl CsvParams {
    pub fn from_uri(uri: &SphereUri) -> Result<Self> {
        let wkt = uri.query_param("wkt");
        let x = uri.query_param("x");
        let y = uri.query_param("y");
        if wkt.is_some() && (x.is_some() || y.is_some()) {
            return Err(SphereError::Config {
                detail: "cannot specify both wkt and x/y geometry params".to_string(),
            });
        }
        if let Some(wkt_field) = wkt {
            Ok(CsvParams::Wkt(wkt_field))
        } else {
            match (x, y) {
                (Some(x), Some(y)) => Ok(CsvParams::XY { x, y }),
                _ => Ok(CsvParams::XY {
                    x: "lng".to_string(),
                    y: "lat".to_string(),
                }),
            }
        }
    }
}

#[derive(Debug)]
pub enum CsvGeometry {
    WKT(String),
    XY((String, String)),
}

impl CsvGeometry {
    fn get_value(&self, record: &JsonObject) -> Option<Value> {
        match &self {
            CsvGeometry::XY((xfield, yfield)) => {
                let x = record
                    .get(xfield)
                    .and_then(|value| match value {
                        serde_json::Value::Number(n) => n.as_f64(),
                        serde_json::Value::String(s) => s.parse::<f64>().ok(),
                        _ => None,
                    });

                let y = record
                    .get(yfield)
                    .and_then(|value| match value {
                        serde_json::Value::Number(n) => n.as_f64(),
                        serde_json::Value::String(s) => s.parse::<f64>().ok(),
                        _ => None,
                    });

                let pos: Option<Position> = vec![x, y].into_iter().collect();
                pos.map(Value::Point)
            }
            CsvGeometry::WKT(wkt_field) => {
                let wkt_str = record.get(wkt_field).and_then(|v| match v {
                    serde_json::Value::String(s) => Some(s.clone()),
                    _ => None,
                })?;
                let parsed: wkt::Wkt<f64> = wkt::Wkt::from_str(&wkt_str).ok()?;
                let geo_geom: geo::Geometry<f64> =
                    geo::Geometry::try_from(parsed).ok()?;
                Some(Value::from(&geo_geom))
            }
        }
    }
}

#[derive(Debug)]
pub struct Csv {
    // pub delimiter: String,
    pub geometry: CsvGeometry,
    pub path: String,
}

impl Bounds for Csv {
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
                println!("{}", err);
                None
            }
        }
    }
}

#[derive(Debug)]
pub struct CsvReadResult {
    pub features: Vec<Feature>,
    pub skipped: u64,
}

impl Csv {
    pub fn read(&self) -> Result<CsvReadResult> {
        let file = File::open(self.path.as_str()).with_path(&self.path)?;
        let mut features = Vec::<Feature>::new();
        let mut skipped: u64 = 0;
        let mut rdr = csv::Reader::from_reader(file);
        for result in rdr.deserialize() {
            let record: JsonObject = result.map_err(|source| SphereError::Csv {
                path: self.path.clone(),
                source,
            })?;
            match self.geometry.get_value(&record) {
                Some(geom) => features.push(Feature {
                    bbox: None,
                    geometry: Some(Geometry::new(geom)),
                    id: None,
                    properties: Some(record),
                    foreign_members: None,
                }),
                None => skipped += 1,
            }
        }

        Ok(CsvReadResult { features, skipped })
    }

    pub fn header_columns(&self) -> Result<Vec<String>> {
        let file = File::open(self.path.as_str()).with_path(&self.path)?;
        let mut rdr = csv::Reader::from_reader(file);
        let headers = rdr.headers().map_err(|source| SphereError::Csv {
            path: self.path.clone(),
            source,
        })?;
        Ok(headers.iter().map(|h| h.to_string()).collect())
    }

    pub fn get_features(&self) -> Result<Vec<Feature>> {
        Ok(self.read()?.features)
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

    pub fn get_schema(&self) -> Result<SourceSchema> {
        let features = self.get_features()?;
        Ok(infer_source_schema(features.iter()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::SphereUri;

    #[test]
    fn test_csv_params_missing_xy_defaults_to_lng_lat() {
        let uri = SphereUri::parse("file:///data/points.csv").unwrap();
        let params = CsvParams::from_uri(&uri).unwrap();
        assert!(matches!(params, CsvParams::XY { x, y } if x == "lng" && y == "lat"));
    }

    #[test]
    fn test_csv_params_custom_xy() {
        let uri = SphereUri::parse("file:///data/points.csv?x=longitude&y=latitude").unwrap();
        let params = CsvParams::from_uri(&uri).unwrap();
        assert!(matches!(params, CsvParams::XY { x, y } if x == "longitude" && y == "latitude"));
    }

    #[test]
    fn test_csv_params_wkt() {
        let uri = SphereUri::parse("file:///data/points.csv?wkt=geom").unwrap();
        let params = CsvParams::from_uri(&uri).unwrap();
        assert!(matches!(params, CsvParams::Wkt(f) if f == "geom"));
    }

    #[test]
    fn test_csv_params_xy_and_wkt_is_error() {
        let uri = SphereUri::parse("file:///data/points.csv?x=longitude&y=latitude&wkt=geom").unwrap();
        assert!(CsvParams::from_uri(&uri).is_err());
    }

    #[test]
    fn test_csv_params_conflict_error_message() {
        let uri = SphereUri::parse("file:///data/points.csv?x=lon&y=lat&wkt=geom").unwrap();
        let err = CsvParams::from_uri(&uri).unwrap_err();
        assert!(err.to_string().contains("wkt"));
    }

    #[test]
    fn test_valid_jsonfile() {
    }

    #[test]
    fn test_valid_bounds() {
    }

    fn csv_at(path: &str, geometry: CsvGeometry) -> Csv {
        Csv {
            path: path.to_string(),
            geometry,
        }
    }

    #[test]
    fn read_reports_zero_skipped_when_all_rows_parse() {
        let source = csv_at(
            "./assets/csv/points.csv",
            CsvGeometry::XY(("lng".to_string(), "lat".to_string())),
        );
        let result = source.read().unwrap();

        assert_eq!(result.features.len(), 2);
        assert_eq!(result.skipped, 0);
    }

    #[test]
    fn read_counts_every_row_that_yields_no_geometry() {
        let source = csv_at(
            "./assets/csv/broken.csv",
            CsvGeometry::XY(("lng".to_string(), "lat".to_string())),
        );
        let result = source.read().unwrap();

        assert_eq!(result.features.len(), 0);
        assert_eq!(result.skipped, 3);
    }

    #[test]
    fn header_columns_returns_the_header_row_regardless_of_geometry() {
        let source = csv_at(
            "./assets/csv/broken.csv",
            CsvGeometry::XY(("lng".to_string(), "lat".to_string())),
        );
        let columns = source.header_columns().unwrap();

        assert_eq!(columns, vec!["name", "longitude", "latitude"]);
    }

    #[test]
    fn get_features_still_returns_only_parsed_features() {
        let source = csv_at(
            "./assets/csv/points.csv",
            CsvGeometry::XY(("lng".to_string(), "lat".to_string())),
        );

        assert_eq!(source.get_features().unwrap().len(), 2);
    }
}
