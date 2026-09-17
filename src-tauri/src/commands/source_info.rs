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

#[tauri::command]
pub async fn source_get_info(
    id: String,
    storage: State<'_, SourceStorage>,
) -> Result<SourceInfo, String> {
    let store = storage.store.lock().unwrap();
    let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;

    let schema = match &entry.store {
        Some(fs) => fs.schema().clone(),
        None => entry.source.get_schema()?,
    };

    let (details, path) = match &entry.source.data {
        SourceData::Csv(csv) => {
            let read = csv.read().map_err(|e| e.to_string())?;
            let header_columns = csv.header_columns().map_err(|e| e.to_string())?;
            let (mode, wkt_column, x_column, y_column) = match &csv.geometry {
                libsphere::csv::CsvGeometry::WKT(field) => {
                    (CsvMode::Wkt, Some(field.clone()), None, None)
                }
                libsphere::csv::CsvGeometry::XY((x, y)) => {
                    (CsvMode::Xy, None, Some(x.clone()), Some(y.clone()))
                }
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
                Some(csv.path.clone()),
            )
        }
        SourceData::Shapefile(shp) => {
            let info = shp.info();
            (
                FormatDetails::Shapefile {
                    has_dbf: info.has_dbf,
                    has_shx: info.has_shx,
                    has_prj: info.has_prj,
                    has_cpg: info.has_cpg,
                    crs: info.crs,
                },
                Some(shp.path.clone()),
            )
        }
        SourceData::Gpx(gpx) => {
            let info = gpx.info().map_err(|e| e.to_string())?;
            (
                FormatDetails::Gpx {
                    waypoints: info.waypoints,
                    tracks: info.tracks,
                    routes: info.routes,
                    track_points: info.track_points,
                },
                Some(gpx.path.clone()),
            )
        }
        SourceData::Geojson(g) => (FormatDetails::Geojson, Some(g.path.clone())),
        SourceData::GeojsonSeq(g) => (FormatDetails::Geojson, Some(g.path.clone())),
        _ => (FormatDetails::Geojson, None),
    };

    let file = path.as_deref().and_then(file_info_for);

    Ok(SourceInfo {
        file,
        schema,
        details,
    })
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
}
