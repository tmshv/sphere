use geo::BoundingRect;
use geozero::geojson::GeoJson;
use geozero::geojson::GeoJsonWriter;
use geozero::ToGeo;
use geozero_shp;
use shapefile::dbase::FieldValue;
use std::collections::HashMap;
use std::path::Path;

use super::Bounds;
use crate::error::{Result, SphereError};
use crate::schema::{ColumnType, SourceSchema};

#[derive(Debug)]
pub struct Shapefile {
    pub path: String,
}

#[derive(Debug, Clone)]
pub struct ShapefileInfo {
    pub has_dbf: bool,
    pub has_shx: bool,
    pub has_prj: bool,
    pub has_cpg: bool,
    pub crs: Option<String>,
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
    fn sidecar_path(&self, extension: &str) -> std::path::PathBuf {
        Path::new(&self.path).with_extension(extension)
    }

    pub fn info(&self) -> ShapefileInfo {
        let prj_path = self.sidecar_path("prj");
        let crs = std::fs::read_to_string(&prj_path)
            .ok()
            .map(|text| text.trim().to_string())
            .filter(|text| !text.is_empty());

        ShapefileInfo {
            has_dbf: self.sidecar_path("dbf").is_file(),
            has_shx: self.sidecar_path("shx").is_file(),
            has_prj: prj_path.is_file(),
            has_cpg: self.sidecar_path("cpg").is_file(),
            crs,
        }
    }

    pub fn get_schema(&self) -> Result<SourceSchema> {
        let mut reader = shapefile::Reader::from_path(&self.path).map_err(|e| SphereError::Shape {
            path: self.path.clone(),
            detail: e.to_string(),
        })?;
        let mut columns: HashMap<String, ColumnType> = HashMap::new();
        let mut points_count: u32 = 0;
        let mut multi_points_count: u32 = 0;
        let mut lines_count: u32 = 0;
        let multi_lines_count: u32 = 0;
        let mut polygons_count: u32 = 0;
        let multi_polygons_count: u32 = 0;
        let mut null_geometry_count: u32 = 0;
        let mut features_count: u32 = 0;

        for result in reader.iter_shapes_and_records() {
            let (shape, record) = result.map_err(|e| SphereError::Shape {
                path: self.path.clone(),
                detail: e.to_string(),
            })?;

            features_count += 1;

            match shape {
                shapefile::Shape::Point(_)
                | shapefile::Shape::PointM(_)
                | shapefile::Shape::PointZ(_) => points_count += 1,
                shapefile::Shape::Multipoint(_)
                | shapefile::Shape::MultipointM(_)
                | shapefile::Shape::MultipointZ(_) => {
                    points_count += 1;
                    multi_points_count += 1;
                }
                shapefile::Shape::Polyline(_)
                | shapefile::Shape::PolylineM(_)
                | shapefile::Shape::PolylineZ(_) => lines_count += 1,
                shapefile::Shape::Polygon(_)
                | shapefile::Shape::PolygonM(_)
                | shapefile::Shape::PolygonZ(_) => polygons_count += 1,
                shapefile::Shape::NullShape => null_geometry_count += 1,
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
            multi_points_count,
            lines_count,
            multi_lines_count,
            polygons_count,
            multi_polygons_count,
            collections_count: 0,
            null_geometry_count,
            features_count,
        })
    }

    pub fn to_geojson(&self) -> Result<String> {
        let reader = geozero_shp::Reader::from_path(self.path.as_str()).map_err(|e| SphereError::Shape {
            path: self.path.clone(),
            detail: e.to_string(),
        })?;
        let mut json: Vec<u8> = Vec::new();
        let mut g = GeoJsonWriter::new(&mut json);
        // TODO do this without count
        reader.iter_features(&mut g).map_err(|e| SphereError::Shape {
            path: self.path.clone(),
            detail: e.to_string(),
        })?.count();
        String::from_utf8(json).map_err(|e| SphereError::Shape {
            path: self.path.clone(),
            detail: e.to_string(),
        })
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

    #[test]
    fn test_missing_file_has_path_context() {
        let shapefile = Shapefile {
            path: "./nonexistent.shp".to_string(),
        };
        let err = shapefile.to_geojson().unwrap_err();
        assert!(err.to_string().contains("nonexistent.shp"));
    }

    #[test]
    fn info_detects_present_sidecars() {
        let source = Shapefile {
            path: "./assets/shape-files/ne_10m_populated_places.shp".to_string(),
        };
        let info = source.info();

        assert!(info.has_dbf);
        assert!(info.has_shx);
    }

    #[test]
    fn info_reports_missing_sidecars_as_false() {
        let source = Shapefile {
            path: "./assets/shape-files/does_not_exist.shp".to_string(),
        };
        let info = source.info();

        assert!(!info.has_dbf);
        assert!(!info.has_shx);
        assert!(!info.has_prj);
        assert!(!info.has_cpg);
        assert_eq!(info.crs, None);
    }

    #[test]
    fn schema_reports_features_count_and_multi_counts() {
        let source = Shapefile {
            path: "./assets/shape-files/ne_10m_populated_places.shp".to_string(),
        };
        let schema = source.get_schema().unwrap();

        assert_eq!(schema.features_count, 7342);
        assert_eq!(schema.points_count, 7342);
        assert_eq!(schema.multi_points_count, 0);
    }
}
