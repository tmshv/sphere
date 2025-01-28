use geo::BoundingRect;
use geojson::{Feature, FeatureCollection, Geometry, Value};
use geozero::geojson::GeoJson;
use geozero::ToGeo;
use gpx;
use gpx::read;
use std::io::BufReader;
use std::{fs::File, result};

use super::Bounds;

#[derive(Debug)]
pub enum GpxError {
    // FS(std::io::Error),
    FS,
    // Serialize,
}

impl From<std::io::Error> for GpxError {
    // fn from(err: std::io::Error) -> Self {
    fn from(_: std::io::Error) -> Self {
        // GpxError::FS(err)
        GpxError::FS
    }
}

pub type Result<T> = result::Result<T, GpxError>;

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
                println!("{:?}", err);
                None
            }
        }
    }
}

impl Gpx {
    pub fn to_geojson(&self) -> Result<String> {
        println!("reading GPX {}", self.path);

        let file = File::open(self.path.as_str())?;
        let reader = BufReader::new(file);

        // read takes any io::Read and gives a Result<Gpx, Error>.
        let gpx: gpx::Gpx = read(reader).unwrap();

        // Each GPX file has multiple "tracks", this takes the first one.
        // let track: &Track = &gpx.tracks[0];

        // Each track will have different segments full of waypoints, where a
        // waypoint contains info like latitude, longitude, and elevation.
        // let segment: &TrackSegment = &track.segments[0];

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
                    // properties: Some(record),
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
