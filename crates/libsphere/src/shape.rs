use geo::BoundingRect;
use geozero::geojson::GeoJson;
use geozero::geojson::GeoJsonWriter;
use geozero::ToGeo;
use geozero_shp;
use shapefile::dbase::FieldValue;
use std::collections::HashMap;
use std::result;

use super::Bounds;
use crate::schema::{ColumnType, SourceSchema};

#[derive(Debug)]
pub enum ShapeError {
    // Shape(geozero_shp::Error),
    Shape,
    Serialize,
}

impl From<geozero_shp::Error> for ShapeError {
    // fn from(err: geozero_shp::Error) -> Self {
    fn from(_: geozero_shp::Error) -> Self {
        // ShapeError::Shape(err)
        ShapeError::Shape
    }
}

impl From<shapefile::Error> for ShapeError {
    fn from(_: shapefile::Error) -> Self {
        ShapeError::Shape
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
            Err(_) => None,
        }
    }
}

impl Shapefile {
    pub fn get_schema(&self) -> Result<SourceSchema> {
        let mut reader = shapefile::Reader::from_path(&self.path)?;
        let mut columns: HashMap<String, ColumnType> = HashMap::new();
        let mut points_count: u32 = 0;
        let mut lines_count: u32 = 0;
        let mut polygons_count: u32 = 0;

        for result in reader.iter_shapes_and_records() {
            let (shape, record) = result?;

            match shape {
                shapefile::Shape::Point(_)
                | shapefile::Shape::PointM(_)
                | shapefile::Shape::PointZ(_)
                | shapefile::Shape::Multipoint(_)
                | shapefile::Shape::MultipointM(_)
                | shapefile::Shape::MultipointZ(_) => points_count += 1,
                shapefile::Shape::Polyline(_)
                | shapefile::Shape::PolylineM(_)
                | shapefile::Shape::PolylineZ(_) => lines_count += 1,
                shapefile::Shape::Polygon(_)
                | shapefile::Shape::PolygonM(_)
                | shapefile::Shape::PolygonZ(_) => polygons_count += 1,
                _ => {}
            }

            for (name, value) in record {
                let col_type = match value {
                    FieldValue::Character(_) | FieldValue::Memo(_) => ColumnType::Str,
                    FieldValue::Numeric(_) | FieldValue::Float(_) | FieldValue::Integer(_) => {
                        ColumnType::Num
                    }
                    _ => ColumnType::Mixed,
                };
                columns
                    .entry(name)
                    .and_modify(|existing| {
                        if *existing != col_type {
                            *existing = ColumnType::Mixed;
                        }
                    })
                    .or_insert(col_type);
            }
        }

        let columns = columns
            .into_iter()
            .map(|(k, v)| (k, v.as_str().to_string()))
            .collect();

        Ok(SourceSchema {
            columns,
            points_count,
            lines_count,
            polygons_count,
        })
    }

    pub fn to_geojson(&self) -> Result<String> {
        let reader = geozero_shp::Reader::from_path(self.path.as_str())?;
        let mut json: Vec<u8> = Vec::new();
        let mut g = GeoJsonWriter::new(&mut json);
        // TODO do this without count
        reader.iter_features(&mut g)?.count();
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

    #[test]
    fn test_get_schema() {
        let shapefile = Shapefile {
            path: "./assets/shape-files/ne_10m_populated_places.shp".to_string(),
        };
        let schema = shapefile.get_schema().unwrap();
        assert!(schema.points_count == 7342);
        assert_eq!(schema.lines_count, 0);
        assert_eq!(schema.polygons_count, 0);
        assert!(!schema.columns.is_empty());
    }
}
