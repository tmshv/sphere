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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zoom_zero_has_one_row_so_y_is_unchanged() {
        let tile = Tile { x: 0, y: 0, zoom: 0 };

        assert_eq!(tile.as_tms(), (0, 0, 0));
    }

    #[test]
    fn y_is_flipped_within_the_zoom_level() {
        let tile = Tile { x: 1, y: 0, zoom: 1 };

        assert_eq!(tile.as_tms(), (1, 1, 1));
    }

    #[test]
    fn zoom_and_x_are_passed_through_untouched() {
        let tile = Tile { x: 3, y: 2, zoom: 2 };

        let (zoom, x, y) = tile.as_tms();

        assert_eq!(zoom, 2);
        assert_eq!(x, 3);
        assert_eq!(y, 1);
    }

    #[test]
    fn flipping_twice_returns_the_original_row() {
        let tile = Tile { x: 0, y: 5, zoom: 4 };

        let (zoom, x, y) = tile.as_tms();
        let back = Tile { x, y, zoom }.as_tms();

        assert_eq!(back.2, 5);
    }
}
