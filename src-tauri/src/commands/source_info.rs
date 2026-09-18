use libsphere::csv::{Csv, CsvGeometry};
use libsphere::gpx::Gpx;
use libsphere::shape::Shapefile;
use libsphere::source::SourceData;
use serde::Serialize;
use tauri::State;

use crate::state::SourceStorage;
use libsphere::schema::SourceSchema;

#[derive(Serialize, Debug, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum CsvMode {
    Xy,
    Wkt,
}

#[derive(Serialize, Debug)]
#[serde(tag = "format", rename_all = "lowercase")]
pub enum FormatDetails {
    Geojson,
    Csv {
        mode: CsvMode,
        wkt_column: Option<String>,
        x_column: Option<String>,
        y_column: Option<String>,
        header_columns: Vec<String>,
        parsed_rows: u64,
        skipped_rows: u64,
    },
    Shapefile {
        has_dbf: bool,
        has_shx: bool,
        has_prj: bool,
        has_cpg: bool,
        crs: Option<String>,
    },
    Gpx {
        waypoints: u64,
        tracks: u64,
        routes: u64,
        track_points: u64,
    },
}

#[derive(Serialize, Debug)]
pub struct FileInfo {
    pub size_bytes: u64,
    pub modified: Option<String>,
}

#[derive(Serialize, Debug)]
pub struct SourceInfo {
    pub file: Option<FileInfo>,
    pub schema: SourceSchema,
    pub details: FormatDetails,
}

fn file_info_for(path: &str) -> Option<FileInfo> {
    let metadata = std::fs::metadata(path).ok()?;
    let modified = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs().to_string());
    Some(FileInfo {
        size_bytes: metadata.len(),
        modified,
    })
}

/// What `source_get_info` still has to read from disk, lifted out of the storage
/// lock. The source's own structs are not `Clone`, so the parts that identify the
/// file — its path, and for CSV the geometry columns — are copied out and the
/// reader is rebuilt on the blocking thread.
enum InfoTarget {
    Csv(Csv),
    Shapefile(Shapefile),
    Gpx(Gpx),
    Plain(Option<String>),
}

fn clone_csv_geometry(geometry: &CsvGeometry) -> CsvGeometry {
    match geometry {
        CsvGeometry::WKT(field) => CsvGeometry::WKT(field.clone()),
        CsvGeometry::XY((x, y)) => CsvGeometry::XY((x.clone(), y.clone())),
    }
}

fn info_target_for(data: &SourceData) -> InfoTarget {
    match data {
        SourceData::Csv(csv) => InfoTarget::Csv(Csv {
            geometry: clone_csv_geometry(&csv.geometry),
            path: csv.path.clone(),
        }),
        SourceData::Shapefile(shp) => InfoTarget::Shapefile(Shapefile {
            path: shp.path.clone(),
        }),
        SourceData::Gpx(gpx) => InfoTarget::Gpx(Gpx {
            path: gpx.path.clone(),
        }),
        SourceData::Geojson(g) => InfoTarget::Plain(Some(g.path.clone())),
        SourceData::GeojsonSeq(g) => InfoTarget::Plain(Some(g.path.clone())),
        _ => InfoTarget::Plain(None),
    }
}

/// Parses the file. Blocking: never call this while holding the storage lock.
fn details_and_file(target: InfoTarget) -> Result<(FormatDetails, Option<FileInfo>), String> {
    let (details, path) = match target {
        InfoTarget::Csv(csv) => {
            let read = csv.read().map_err(|e| e.to_string())?;
            let header_columns = csv.header_columns().map_err(|e| e.to_string())?;
            let (mode, wkt_column, x_column, y_column) = match &csv.geometry {
                CsvGeometry::WKT(field) => (CsvMode::Wkt, Some(field.clone()), None, None),
                CsvGeometry::XY((x, y)) => (CsvMode::Xy, None, Some(x.clone()), Some(y.clone())),
            };
            (
                FormatDetails::Csv {
                    mode,
                    wkt_column,
                    x_column,
                    y_column,
                    header_columns,
                    parsed_rows: read.features.len() as u64,
                    skipped_rows: read.skipped,
                },
                Some(csv.path),
            )
        }
        InfoTarget::Shapefile(shp) => {
            let info = shp.info();
            (
                FormatDetails::Shapefile {
                    has_dbf: info.has_dbf,
                    has_shx: info.has_shx,
                    has_prj: info.has_prj,
                    has_cpg: info.has_cpg,
                    crs: info.crs,
                },
                Some(shp.path),
            )
        }
        InfoTarget::Gpx(gpx) => {
            let info = gpx.info().map_err(|e| e.to_string())?;
            (
                FormatDetails::Gpx {
                    waypoints: info.waypoints,
                    tracks: info.tracks,
                    routes: info.routes,
                    track_points: info.track_points,
                },
                Some(gpx.path),
            )
        }
        InfoTarget::Plain(path) => (FormatDetails::Geojson, path),
    };

    let file = path.as_deref().and_then(file_info_for);
    Ok((details, file))
}

#[tauri::command]
pub async fn source_get_info(
    id: String,
    storage: State<'_, SourceStorage>,
) -> Result<SourceInfo, String> {
    // Take only what is needed out of the lock: reading the file under it would
    // block every other source command, `source_get` included, for the whole
    // re-parse.
    let (schema, target) = {
        let store = storage.store.lock().unwrap();
        let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;

        let schema = match &entry.store {
            Some(fs) => fs.schema().clone(),
            None => entry.source.get_schema()?,
        };

        (schema, info_target_for(&entry.source.data))
    };

    let (details, file) = tokio::task::spawn_blocking(move || details_and_file(target))
        .await
        .map_err(|e| e.to_string())??;

    Ok(SourceInfo {
        file,
        schema,
        details,
    })
}

fn csv_geometry_from_params(
    mode: &str,
    wkt_column: Option<String>,
    x_column: Option<String>,
    y_column: Option<String>,
) -> Result<CsvGeometry, String> {
    match mode {
        "wkt" => {
            if x_column.is_some() || y_column.is_some() {
                return Err("cannot specify both wkt and x/y geometry params".to_string());
            }
            let field = wkt_column.ok_or_else(|| "wkt mode requires a wkt column".to_string())?;
            Ok(CsvGeometry::WKT(field))
        }
        "xy" => {
            if wkt_column.is_some() {
                return Err("cannot specify both wkt and x/y geometry params".to_string());
            }
            match (x_column, y_column) {
                (Some(x), Some(y)) => Ok(CsvGeometry::XY((x, y))),
                _ => Err("xy mode requires both an x column and a y column".to_string()),
            }
        }
        other => Err(format!("unknown csv geometry mode '{}'", other)),
    }
}

#[tauri::command]
pub async fn source_set_csv_geometry(
    id: String,
    mode: String,
    wkt_column: Option<String>,
    x_column: Option<String>,
    y_column: Option<String>,
    storage: State<'_, SourceStorage>,
) -> Result<SourceSchema, String> {
    let geometry = csv_geometry_from_params(&mode, wkt_column, x_column, y_column)?;

    let mut store = storage.store.lock().unwrap();
    let entry = store
        .get_mut(&id)
        .ok_or_else(|| format!("Not found {}", &id))?;

    // Swap the new geometry in, keeping the old one so a failed rebuild can roll back.
    let previous = match &mut entry.source.data {
        SourceData::Csv(csv) => std::mem::replace(&mut csv.geometry, geometry),
        _ => return Err(format!("Source '{}' is not a CSV source", id)),
    };

    match crate::commands::source::build_feature_store(&entry.source) {
        Ok(feature_store) => {
            let schema = feature_store.schema().clone();
            entry.store = Some(std::sync::Arc::new(feature_store));
            Ok(schema)
        }
        Err(err) => {
            if let SourceData::Csv(csv) = &mut entry.source.data {
                csv.geometry = previous;
            }
            Err(err)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn geojson_details_serialize_with_a_format_tag_and_no_extra_fields() {
        let json = serde_json::to_value(FormatDetails::Geojson).unwrap();

        assert_eq!(json, serde_json::json!({ "format": "geojson" }));
    }

    #[test]
    fn csv_details_serialize_every_picker_field() {
        let details = FormatDetails::Csv {
            mode: CsvMode::Xy,
            wkt_column: None,
            x_column: Some("lng".to_string()),
            y_column: Some("lat".to_string()),
            header_columns: vec!["name".to_string(), "lng".to_string()],
            parsed_rows: 2,
            skipped_rows: 3,
        };
        let json = serde_json::to_value(details).unwrap();

        assert_eq!(json["format"], "csv");
        assert_eq!(json["mode"], "xy");
        assert_eq!(json["x_column"], "lng");
        assert_eq!(json["skipped_rows"], 3);
    }

    #[test]
    fn shapefile_details_serialize_sidecar_flags() {
        let details = FormatDetails::Shapefile {
            has_dbf: true,
            has_shx: true,
            has_prj: false,
            has_cpg: false,
            crs: None,
        };
        let json = serde_json::to_value(details).unwrap();

        assert_eq!(json["format"], "shapefile");
        assert_eq!(json["has_dbf"], true);
        assert_eq!(json["crs"], serde_json::Value::Null);
    }

    #[test]
    fn xy_mode_requires_both_columns() {
        let err = csv_geometry_from_params("xy", None, Some("lng".to_string()), None).unwrap_err();

        assert!(err.contains("x"));
        assert!(err.contains("y"));
    }

    #[test]
    fn wkt_mode_requires_a_column() {
        let err = csv_geometry_from_params("wkt", None, None, None).unwrap_err();

        assert!(err.contains("wkt"));
    }

    #[test]
    fn wkt_mode_rejects_xy_columns() {
        let err = csv_geometry_from_params(
            "wkt",
            Some("geom".to_string()),
            Some("lng".to_string()),
            Some("lat".to_string()),
        )
        .unwrap_err();

        assert!(err.contains("wkt"));
    }

    #[test]
    fn xy_mode_builds_an_xy_geometry() {
        let geometry =
            csv_geometry_from_params("xy", None, Some("lng".to_string()), Some("lat".to_string()))
                .unwrap();

        assert!(matches!(geometry, CsvGeometry::XY((x, y)) if x == "lng" && y == "lat"));
    }

    #[test]
    fn info_target_keeps_the_csv_path_and_geometry() {
        let data = SourceData::Csv(Csv {
            geometry: CsvGeometry::WKT("geom".to_string()),
            path: "/tmp/a.csv".to_string(),
        });

        match info_target_for(&data) {
            InfoTarget::Csv(csv) => {
                assert_eq!(csv.path, "/tmp/a.csv");
                assert!(matches!(csv.geometry, CsvGeometry::WKT(field) if field == "geom"));
            }
            _ => panic!("expected a csv target"),
        }
    }

    #[test]
    fn info_target_for_a_tile_source_has_no_path_to_read() {
        let data = SourceData::InMemory(geojson::FeatureCollection {
            bbox: None,
            features: vec![],
            foreign_members: None,
        });

        assert!(matches!(info_target_for(&data), InfoTarget::Plain(None)));
    }

    #[test]
    fn unknown_mode_is_rejected() {
        let err = csv_geometry_from_params("h3", None, None, None).unwrap_err();

        assert!(err.contains("h3"));
    }
}
