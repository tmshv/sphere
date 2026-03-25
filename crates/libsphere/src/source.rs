// use geozero::geojson::GeoJson;
// use geozero::ToGeo;
use sha256::digest;
use std::path::Path;
// use std::result;
use url::Url;
use urlencoding;

use super::csv::{Csv, CsvGeometry, CsvParams};
use super::geojson::Geojson;
use super::geojsonseq::GeojsonSeq;
use super::gpx::Gpx;
use super::mbtiles::Tiles;
use super::schema::{assign_feature_ids, SourceSchema};
use super::shape::Shapefile;
use super::uri::SphereUri;
use super::Bounds;

// #[derive(Debug)]
// pub enum SourceError {
// DB(RusqliteError),
// Serialize(SerdeError),
// NotFound,
// BadGeometry,
// UnknownType,
// }

// impl From<RusqliteError> for MbtilesError {
//     fn from(err: RusqliteError) -> Self {
//         MbtilesError::DB(err)
//     }
// }

// pub type SResult<T> = result::Result<T, SourceError>;

#[derive(Debug)]
pub enum SourceData {
    Geojson(Geojson),
    GeojsonSeq(GeojsonSeq),
    Shapefile(Shapefile),
    Mbtiles(Tiles),
    Csv(Csv),
    Gpx(Gpx),
    InMemory(geojson::FeatureCollection),
    // Pmtiles,
}

#[derive(Debug)]
pub struct Source {
    pub id: String,
    pub name: String,
    pub location: String, // TODO: need it here?
    pub data: SourceData,
}

impl Bounds for Source {
    fn get_bounds(&self) -> Option<(f64, f64, f64, f64)> {
        match &self.data {
            SourceData::Geojson(val) => val.get_bounds(),
            SourceData::GeojsonSeq(val) => val.get_bounds(),
            SourceData::Shapefile(val) => val.get_bounds(),
            SourceData::Csv(val) => val.get_bounds(),
            SourceData::Gpx(val) => val.get_bounds(),
            _ => None,
        }
    }
}

impl Source {
    pub fn from_url(source_url: Url) -> Result<Self, String> {
        let scheme = source_url.scheme();
        match scheme {
            "sphere" => {
                println!(
                    "Found Sphere source. Will load {} from FS",
                    &source_url.domain().unwrap_or("unknown")
                );
            }
            "file" => {
                println!("Found file source. Will load {} from FS", &source_url);
            }
            "http" => {
                println!("Found HTTP source. Will load remote {}", &source_url);
            }
            "https" => {
                println!("Found HTTPS source. Will load remote {}", &source_url);
            }
            _ => {
                return Err(format!("Cannot handle scheme {}", scheme));
            }
        }

        let id = digest(source_url.to_string());

        let path = urlencoding::decode(source_url.path())
            .map_err(|e| format!("Invalid URL path encoding: {}", e))?
            .to_string();
        let path = Path::new(path.as_str());
        if !path.is_file() {
            return Err("File not found".into());
        }

        let sphere_uri = SphereUri::parse(source_url.as_str())
            .map_err(|e| e.to_string())?;
        let (data, location) = Source::create_data(&id, path, &sphere_uri)?;
        let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or("unknown").to_string();

        Ok(Source {
            id,
            name,
            location,
            data,
        })
    }

    fn create_data(id: &String, path: &Path, uri: &SphereUri) -> Result<(SourceData, String), String> {
        let source_path = path
            .to_str()
            .ok_or_else(|| "Path contains non-UTF-8 characters".to_string())?
            .to_string();
        let file_url = format!("file://{}", source_path);
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        match ext {
            "shp" => {
                let source = Shapefile { path: source_path };
                Ok((SourceData::Shapefile(source), file_url))
            }
            "geojson" => {
                let source = Geojson { path: source_path };
                Ok((SourceData::Geojson(source), file_url))
            }
            "geojsonl" => {
                let source = GeojsonSeq { path: source_path };
                Ok((SourceData::GeojsonSeq(source), file_url))
            }
            "mbtiles" => {
                let source = Tiles::new(id.clone(), source_path);
                Ok((SourceData::Mbtiles(source), file_url))
            }
            "csv" => {
                let params = CsvParams::from_uri(uri).map_err(|e| e.to_string())?;
                let geometry = match params {
                    CsvParams::Wkt(field) => CsvGeometry::WKT(field),
                    CsvParams::XY { x, y } => CsvGeometry::XY((x, y)),
                };
                let source = Csv { path: source_path, geometry };
                Ok((SourceData::Csv(source), file_url))
            }
            "gpx" => {
                let source = Gpx { path: source_path };
                Ok((SourceData::Gpx(source), file_url))
            }
            _ => Err(format!("Cannot handle extension {}", ext)),
        }
    }

    pub fn to_feature_collection(&self) -> Result<geojson::FeatureCollection, String> {
        if let SourceData::InMemory(fc) = &self.data {
            return Ok(fc.clone());
        }
        let raw = match &self.data {
            SourceData::Shapefile(src) => src.to_geojson().map_err(|e| e.to_string())?,
            SourceData::Geojson(src) => src.read().map_err(|e| e.to_string())?,
            SourceData::GeojsonSeq(src) => src.to_geojson().map_err(|e| e.to_string())?,
            SourceData::Csv(src) => src.to_geojson().map_err(|e| e.to_string())?,
            SourceData::Gpx(src) => src.to_geojson().map_err(|e| e.to_string())?,
            _ => return Err("No".into()),
        };
        let geojson: geojson::GeoJson = raw.parse().map_err(|e: geojson::Error| e.to_string())?;
        let mut fc = match geojson {
            geojson::GeoJson::FeatureCollection(fc) => fc,
            geojson::GeoJson::Feature(f) => geojson::FeatureCollection {
                bbox: None,
                features: vec![f],
                foreign_members: None,
            },
            geojson::GeoJson::Geometry(g) => geojson::FeatureCollection {
                bbox: None,
                features: vec![geojson::Feature {
                    bbox: None,
                    geometry: Some(g),
                    id: None,
                    properties: None,
                    foreign_members: None,
                }],
                foreign_members: None,
            },
        };
        assign_feature_ids(&mut fc);
        Ok(fc)
    }

    pub fn to_geojson(&self) -> Result<String, String> {
        let fc = self.to_feature_collection()?;
        serde_json::to_string(&fc).map_err(|e| e.to_string())
    }

    pub fn get_schema(&self) -> Result<SourceSchema, String> {
        match &self.data {
            // SourceData::Shapefile(src) => {
            //     let val = src.to_geojson().expect("No shape");
            //     Ok(val)
            // }
            SourceData::Geojson(src) => {
                src.get_schema().map_err(|e| e.to_string())
            }
            SourceData::GeojsonSeq(src) => {
                src.get_schema().map_err(|e| e.to_string())
            }
            SourceData::Csv(src) => {
                src.get_schema().map_err(|e| e.to_string())
            }
            SourceData::Shapefile(src) => {
                src.get_schema().map_err(|e| e.to_string())
            }
            SourceData::Gpx(src) => {
                src.get_schema().map_err(|e| e.to_string())
            }
            SourceData::InMemory(_) => Err("use FeatureStore".into()),
            _ => Err("Getting schema is not implemented for this type of file".into()),
        }
    }
    // pub fn to_geo(&self) -> SResult<geo::Geometry<f64>> {
    //     match &self.data {
    //         SourceData::Geojson(src) => {
    //             let geojson_str = src.read().unwrap();
    //             let geojson = GeoJson(geojson_str.as_str());
    //             let b = geojson.to_geo().unwrap();
    //             Ok(b)
    //         }
    //         SourceData::Shapefile(src) => {
    //             let val = src.to_geojson().expect("No shape".into());
    //             let geojson = GeoJson(val.as_str());
    //             let b = geojson.to_geo().unwrap();
    //             Ok(b)
    //         }
    //         SourceData::Csv(src) => {
    //             let val = src.to_geojson().expect("No csv".into());
    //             let geojson = GeoJson(val.as_str());
    //             let b = geojson.to_geo().unwrap();
    //             Ok(b)
    //         }
    //         SourceData::Gpx(src) => {
    //             let val = src.to_geojson().expect("No gpx".into());
    //             let geojson = GeoJson(val.as_str());
    //             let b = geojson.to_geo().unwrap();
    //             Ok(b)
    //         }
    //         _ => Err(SourceError::NotFound),
    //     }
    // }

    pub fn get_mbtiles(&self) -> Option<&Tiles> {
        match &self.data {
            SourceData::Mbtiles(val) => Some(val),
            _ => None,
        }
    }
}
