use mbtiles::tile::Tile;

use crate::error::Result;
use crate::mbtiles::Tiles;
use crate::pmtiles::Pmtiles;

/// A tile container served through the `sphere://` protocol: MBTiles or PMTiles.
pub trait TileArchive {
    /// TileJSON of the archive, with the tile URL template pointing at `sphere://`.
    fn get_metadata(&self) -> Result<String>;

    /// Tile bytes, decompressed; empty when the archive has no such tile.
    fn get_tile(&self, tile: &Tile) -> Result<Vec<u8>>;
}

impl TileArchive for Tiles {
    fn get_metadata(&self) -> Result<String> {
        Tiles::get_metadata(self)
    }

    fn get_tile(&self, tile: &Tile) -> Result<Vec<u8>> {
        Tiles::get_tile(self, tile)
    }
}

impl TileArchive for Pmtiles {
    fn get_metadata(&self) -> Result<String> {
        Pmtiles::get_metadata(self)
    }

    fn get_tile(&self, tile: &Tile) -> Result<Vec<u8>> {
        Pmtiles::get_tile(self, tile)
    }
}
