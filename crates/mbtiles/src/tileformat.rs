pub enum TileFormat {
    Png,
    Jpg,
    Webp,
    Pbf,
    Gzip,
    Zlib,
}

pub fn get_tile_format(data: &[u8]) -> TileFormat {
    match data {
        v if &v[0..2] == b"\x1f\x8b" => TileFormat::Gzip,
        v if &v[0..2] == b"\x78\x9c" => TileFormat::Zlib,
        v if &v[0..8] == b"\x89\x50\x4E\x47\x0D\x0A\x1A\x0A" => TileFormat::Png,
        v if &v[0..3] == b"\xFF\xD8\xFF" => TileFormat::Jpg,
        v if &v[0..4] == b"RIFF" && &v[8..12] == b"WEBP" => TileFormat::Webp,
        _ => TileFormat::Pbf,
    }
}
