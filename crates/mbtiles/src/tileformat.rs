const GZIP_MAGIC: &[u8] = b"\x1f\x8b";
const ZLIB_MAGIC: &[u8] = b"\x78\x9c";
const PNG_MAGIC: &[u8] = b"\x89\x50\x4E\x47\x0D\x0A\x1A\x0A";
const JPG_MAGIC: &[u8] = b"\xFF\xD8\xFF";
const RIFF_MAGIC: &[u8] = b"RIFF";
const WEBP_TAG: &[u8] = b"WEBP";
const WEBP_TAG_RANGE: std::ops::Range<usize> = 8..12;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TileFormat {
    Png,
    Jpg,
    Webp,
    Pbf,
    Gzip,
    Zlib,
}

pub fn get_tile_format(data: &[u8]) -> TileFormat {
    if data.starts_with(GZIP_MAGIC) {
        return TileFormat::Gzip;
    }
    if data.starts_with(ZLIB_MAGIC) {
        return TileFormat::Zlib;
    }
    if data.starts_with(PNG_MAGIC) {
        return TileFormat::Png;
    }
    if data.starts_with(JPG_MAGIC) {
        return TileFormat::Jpg;
    }
    if data.starts_with(RIFF_MAGIC) && data.get(WEBP_TAG_RANGE) == Some(WEBP_TAG) {
        return TileFormat::Webp;
    }
    TileFormat::Pbf
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_gzip_from_its_magic_bytes() {
        assert_eq!(get_tile_format(b"\x1f\x8b\x08\x00"), TileFormat::Gzip);
    }

    #[test]
    fn detects_zlib_from_its_magic_bytes() {
        assert_eq!(get_tile_format(b"\x78\x9c\x01\x00"), TileFormat::Zlib);
    }

    #[test]
    fn detects_png_from_its_signature() {
        assert_eq!(get_tile_format(PNG_MAGIC), TileFormat::Png);
    }

    #[test]
    fn detects_jpeg_from_its_signature() {
        assert_eq!(get_tile_format(b"\xFF\xD8\xFF\xE0\x00\x10"), TileFormat::Jpg);
    }

    #[test]
    fn detects_webp_from_the_riff_container_tag() {
        assert_eq!(get_tile_format(b"RIFF\x00\x00\x00\x00WEBPVP8 "), TileFormat::Webp);
    }

    #[test]
    fn a_riff_container_that_is_not_webp_is_not_webp() {
        assert_eq!(get_tile_format(b"RIFF\x00\x00\x00\x00WAVEfmt "), TileFormat::Pbf);
    }

    #[test]
    fn unrecognised_bytes_are_treated_as_pbf() {
        assert_eq!(get_tile_format(b"\x1a\x00\x01\x02"), TileFormat::Pbf);
    }

    #[test]
    fn a_tile_shorter_than_any_signature_is_treated_as_pbf() {
        assert_eq!(get_tile_format(b""), TileFormat::Pbf);
        assert_eq!(get_tile_format(b"\x1f"), TileFormat::Pbf);
        assert_eq!(get_tile_format(b"RIFF"), TileFormat::Pbf);
    }
}
