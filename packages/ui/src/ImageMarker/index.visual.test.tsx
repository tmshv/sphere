import { IMAGE_DATA_URI } from "../visual/fixtures"
import { visualCases } from "../visual/visualCases"
import { ImageMarker } from "."

const SIZE_SMALL = 24
const SIZE_LARGE = 48

visualCases("ImageMarker", {
    circle: { render: () => <ImageMarker src={IMAGE_DATA_URI} size={SIZE_LARGE} layout="circle" /> },
    square: { render: () => <ImageMarker src={IMAGE_DATA_URI} size={SIZE_LARGE} layout="square" /> },
    small: { render: () => <ImageMarker src={IMAGE_DATA_URI} size={SIZE_SMALL} layout="circle" /> },
})
