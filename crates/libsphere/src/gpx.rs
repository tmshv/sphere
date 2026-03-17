use geo::BoundingRect;
use geojson::{Feature, FeatureCollection, GeoJson as GeoJson2, Geometry, Value};
use geozero::geojson::GeoJson;
use geozero::ToGeo;
use gpx;
use gpx::read;
use std::collections::HashMap;
use std::io::BufReader;
use std::fs::File;

use super::Bounds;
use crate::error::{Result, SphereError, WithPath};
use crate::schema::{infer_source_schema, SourceSchema};

#[derive(Debug)]
pub struct Gpx {
    pub path: String,
}

impl Bounds for Gpx {
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
                println!("{}", err);
                None
            }
        }
    }
}

impl Gpx {
    pub fn get_schema(&self) -> Result<SourceSchema> {
        let geojson_str = self.to_geojson()?;
        let geojson = geojson_str.parse::<GeoJson2>().map_err(|source| SphereError::GeoJson {
            path: self.path.clone(),
            source,
        })?;
        if let GeoJson2::FeatureCollection(fc) = geojson {
            return Ok(infer_source_schema(fc.features.iter()));
        }
        Ok(SourceSchema {
            columns: HashMap::new(),
            points_count: 0,
            lines_count: 0,
            polygons_count: 0,
        })
    }

    pub fn to_geojson(&self) -> Result<String> {
        println!("reading GPX {}", self.path);

        let file = File::open(self.path.as_str()).with_path(&self.path)?;
        let reader = BufReader::new(file);

        // read takes any io::Read and gives a Result<Gpx, Error>.
        let gpx: gpx::Gpx = read(reader).map_err(|e| SphereError::Shape {
            path: self.path.clone(),
            detail: e.to_string(),
        })?;

        let mut features = Vec::<Feature>::new();
        for track in gpx.tracks {
            for segment in track.segments {
                let ls = segment.linestring();
                let points = ls.points().map(|p| vec![p.x(), p.y()]).collect::<Vec<Vec<f64>>>();
                let geometry: Geometry = Geometry::new(Value::LineString(points));
                let feature = Feature {
                    bbox: None,
                    geometry: Some(geometry),
                    id: None,
                    properties: None,
                    foreign_members: None,
                };
                features.push(feature);
            }
        }

        let collection = FeatureCollection {
            features,
            bbox: None,
            foreign_members: None,
        };
        Ok(collection.to_string())
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_valid_jsonfile() {
    }

    #[test]
    fn test_valid_bounds() {
    }
}
