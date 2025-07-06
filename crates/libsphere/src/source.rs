// use geozero::geojson::GeoJson;
// use geozero::ToGeo;
use sha256::digest;
use std::collections::HashMap;
use std::path::Path;
// use std::result;
use url::Url;
use urlencoding;

use super::csv::{Csv, CsvGeometry};
use super::geojson::Geojson;
use super::gpx::Gpx;
use super::mbtiles::Mbtiles;
use super::shape::Shapefile;
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
    Shapefile(Shapefile),
    Mbtiles(Mbtiles),
    Csv(Csv),
    Gpx(Gpx),
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
                    &source_url.domain().unwrap()
                );
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

        let path = urlencoding::decode(source_url.path()).unwrap().to_string();
        let path = Path::new(path.as_str());
        if !path.is_file() {
            return Err("File not found".into());
        }

        let (data, location) = Source::create_data(&id, path)?;
        let name = path.file_stem().unwrap().to_str().unwrap().to_string();

        Ok(Source {
            id,
            name,
            location,
            data,
        })
    }

    fn create_data(id: &String, path: &Path) -> Result<(SourceData, String), String> {
        let source_path = path.to_str().expect("Failed to convert path to string").to_string();
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        match ext {
            "shp" => {
                let source = Shapefile { path: source_path };
                Ok((SourceData::Shapefile(source), format!("sphere://source/{}", id)))
            }
            "geojson" => {
                let source = Geojson { path: source_path };
                Ok((SourceData::Geojson(source), format!("sphere://source/{}", id)))
            }
            "mbtiles" => {
                let source = Mbtiles {
                    name: id.clone(),
                    path: source_path,
                };
                Ok((SourceData::Mbtiles(source), format!("sphere://mbtiles/{}", id)))
            }
            "csv" => {
                let source = Csv {
                    path: source_path,
                    geometry: CsvGeometry::XY(("lng".into(), "lat".into())),
                    // delimiter: ",".into(),
                };
                Ok((SourceData::Csv(source), format!("sphere://source/{}", id)))
            }
            "gpx" => {
                let source = Gpx { path: source_path };
                Ok((SourceData::Gpx(source), format!("sphere://source/{}", id)))
            }
            _ => Err(format!("Cannot handle extension {}", ext)),
        }
    }

    pub fn to_geojson(&self) -> Result<String, String> {
        match &self.data {
            SourceData::Shapefile(src) => {
                let val = src.to_geojson().expect("No shape".into());
                Ok(val)
            }
            SourceData::Geojson(src) => {
                let val = src.read().expect("No geojson".into());
                Ok(val)
            }
            SourceData::Csv(src) => {
                let val = src.to_geojson().expect("No csv".into());
                Ok(val)
            }
            SourceData::Gpx(src) => {
                let val = src.to_geojson().expect("No gpx".into());
                Ok(val)
            }
            _ => Err("No".into()),
        }
    }

    pub fn get_schema(&self) -> Result<HashMap<String, String>, String> {
        match &self.data {
            // SourceData::Shapefile(src) => {
            //     let val = src.to_geojson().expect("No shape".into());
            //     Ok(val)
            // }
            SourceData::Geojson(src) => {
                let val = src.get_schema().expect("No schema".into());
                Ok(val)
            }
            SourceData::Csv(src) => {
                let val = src.get_schema().expect("No schema".into());
                Ok(val)
            }
            // SourceData::Gpx(src) => {
            //     let val = src.to_geojson().expect("No gpx".into());
            //     Ok(val)
            // }
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

    pub fn get_mbtiles(&self) -> Option<&Mbtiles> {
        match &self.data {
            SourceData::Mbtiles(val) => Some(&val),
            _ => None,
        }
    }
}
