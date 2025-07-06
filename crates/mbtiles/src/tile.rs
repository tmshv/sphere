use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Tile {
    pub x: i32,
    pub y: i32,
    pub zoom: i32,
}

impl Tile {
    pub fn as_tms(&self) -> (i32, i32, i32) {
        // Flip Y coordinate because MBTiles files are TMS.
        let y = (1 << self.zoom) - 1 - self.y;
        (self.zoom, self.x, y)
    }
}
