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

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::write::{GzEncoder, ZlibEncoder};
    use flate2::Compression;
    use std::io::Write;

    fn gzip(data: &[u8]) -> Vec<u8> {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data).unwrap();
        encoder.finish().unwrap()
    }

    fn zlib(data: &[u8]) -> Vec<u8> {
        let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data).unwrap();
        encoder.finish().unwrap()
    }

    #[test]
    fn gzipped_data_round_trips() {
        let payload = b"a vector tile".to_vec();

        let result = unzip_tile(gzip(&payload), TileFormat::Gzip).unwrap();

        assert_eq!(result, payload);
    }

    #[test]
    fn zlib_data_round_trips() {
        let payload = b"a vector tile".to_vec();

        let result = unzip_tile(zlib(&payload), TileFormat::Zlib).unwrap();

        assert_eq!(result, payload);
    }

    #[test]
    fn uncompressed_formats_are_returned_untouched() {
        let payload = b"\x89PNG\r\n\x1a\nbody".to_vec();

        let result = unzip_tile(payload.clone(), TileFormat::Png).unwrap();

        assert_eq!(result, payload);
    }

    #[test]
    fn data_that_is_not_really_gzipped_is_an_error() {
        let result = unzip_tile(b"not compressed".to_vec(), TileFormat::Gzip);

        assert!(result.is_err());
    }

    #[test]
    fn empty_input_decompresses_to_nothing() {
        let result = unzip_tile(gzip(b""), TileFormat::Gzip).unwrap();

        assert!(result.is_empty());
    }
}
