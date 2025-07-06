use std::io;
use std::io::Read;

use crate::tileformat::TileFormat;
use flate2::read::{GzDecoder, ZlibDecoder};

pub fn unzip_tile(data: Vec<u8>, data_type: TileFormat) -> io::Result<Vec<u8>> {
    match data_type {
        TileFormat::Gzip => {
            let mut decoder = GzDecoder::new(&data[..]);
            let mut result = Vec::new();
            decoder.read_to_end(&mut result)?;
            Ok(result)
        }
        TileFormat::Zlib => {
            let mut decoder = ZlibDecoder::new(&data[..]);
            let mut result = Vec::new();
            decoder.read_to_end(&mut result)?;
            Ok(result)
        }
        _ => Ok(data),
    }
}
