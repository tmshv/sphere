use geo::BoundingRect;
use geozero::geojson::GeoJson;
use geozero::geojson::GeoJsonWriter;
use geozero::ToGeo;
use geozero_shp;
use std::result;

use super::Bounds;

#[derive(Debug)]
pub enum ShapeError {
    Shape(geozero_shp::Error),
    Serialize,
}

impl From<geozero_shp::Error> for ShapeError {
    fn from(err: geozero_shp::Error) -> Self {
        ShapeError::Shape(err)
    }
}

pub type Result<T> = result::Result<T, ShapeError>;

#[derive(Debug)]
pub struct Shapefile {
    pub path: String,
}

impl Bounds for Shapefile {
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
            Err(err) => None,
        }
    }
}

impl Shapefile {
    pub fn to_geojson(&self) -> Result<String> {
        let reader = geozero_shp::Reader::from_path(self.path.as_str())?;
        let mut json: Vec<u8> = Vec::new();
        let mut g = GeoJsonWriter::new(&mut json);
        // TODO do this without count
        let _ = reader.iter_features(&mut g)?.count();
        match String::from_utf8(json) {
            Ok(str) => Ok(str),
            Err(_) => Err(ShapeError::Serialize),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_shapefile() {
        let shapefile = Shapefile {
            path: "./assets/shape-files/ne_10m_populated_places.shp".to_string(),
        };
        assert!(shapefile.to_geojson().is_ok());
    }

    #[test]
    fn test_valid_bounds() {
        let shapefile = Shapefile {
            path: "./assets/shape-files/ne_10m_populated_places.shp".to_string(),
        };
        let bounds = shapefile.get_bounds().unwrap_or_default();
        assert!(bounds == (-179.5899789, -89.9999998, 179.3833036, 82.4833232));
    }
}
