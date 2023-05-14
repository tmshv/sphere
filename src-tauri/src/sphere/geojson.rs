use geozero::geojson;
use std::{fs::File, result};
use std::io::prelude::*;

use super::Bounds;

#[derive(Debug)]
pub enum GeojsonError {
    FS(std::io::Error),
    Serialize,
}

impl From<std::io::Error> for GeojsonError {
    fn from(err: std::io::Error) -> Self {
        GeojsonError::FS(err)
    }
}

pub type Result<T> = result::Result<T, GeojsonError>;

#[derive(Debug)]
pub struct Geojson {
    pub path: String,
}

impl Bounds for Geojson {
    fn get_bounds(&self) -> Option<(f64, f64, f64, f64)> {
        None
    }
}

impl Geojson {
    pub fn read(&self) -> Result<String> {
        let mut file = File::open(self.path.as_str())?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;
        Ok(contents)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_jsonfile() {
        let geojson = Geojson {
            path: "./assets/geojson-files/ne_10m_airports.geojson".to_string(),
        };
        assert!(geojson.read().is_ok());
    }
}
