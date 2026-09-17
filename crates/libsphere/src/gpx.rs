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

#[derive(Debug, Clone)]
pub struct GpxInfo {
    pub waypoints: u64,
    pub tracks: u64,
    pub routes: u64,
    pub track_points: u64,
}

impl Gpx {
    fn parse(&self) -> Result<gpx::Gpx> {
        let file = File::open(self.path.as_str()).with_path(&self.path)?;
        let reader = BufReader::new(file);
        read(reader).map_err(|e| SphereError::Shape {
            path: self.path.clone(),
            detail: e.to_string(),
        })
    }

    pub fn info(&self) -> Result<GpxInfo> {
        let data = self.parse()?;

        let track_points = data
            .tracks
            .iter()
            .flat_map(|track| track.segments.iter())
            .map(|segment| segment.points.len() as u64)
            .sum();

        Ok(GpxInfo {
            waypoints: data.waypoints.len() as u64,
            tracks: data.tracks.len() as u64,
            routes: data.routes.len() as u64,
            track_points,
        })
    }

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
            ..Default::default()
        })
    }

    pub fn to_geojson(&self) -> Result<String> {
        println!("reading GPX {}", self.path);

        // read takes any io::Read and gives a Result<Gpx, Error>.
        let gpx = self.parse()?;

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
    use super::*;

    #[test]
    fn to_geojson_produces_one_linestring_per_track_segment() {
        let source = Gpx {
            path: "./assets/gpx/sample.gpx".to_string(),
        };
        let geojson_str = source.to_geojson().unwrap();
        let geojson: GeoJson2 = geojson_str.parse().unwrap();
        if let GeoJson2::FeatureCollection(fc) = geojson {
            assert_eq!(fc.features.len(), 2);
        } else {
            panic!("expected FeatureCollection");
        }
    }

    #[test]
    fn test_valid_bounds() {
    }

    #[test]
    fn info_counts_waypoints_routes_tracks_and_track_points() {
        let source = Gpx {
            path: "./assets/gpx/sample.gpx".to_string(),
        };
        let info = source.info().unwrap();

        assert_eq!(info.waypoints, 1);
        assert_eq!(info.routes, 1);
        assert_eq!(info.tracks, 1);
        assert_eq!(info.track_points, 4);
    }
}
