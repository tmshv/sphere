import type { IconProps } from "../tabler"

const DEFAULT_SIZE = 24
const VIEW_BOX_SIZE = 10
// A right-pointing triangle with its tip at mid-height, inset so the rotated glyph stays inside the box.
const TRIANGLE_PATH = "M2.5 1 L8 5 L2.5 9 Z"

/** The disclosure triangle of an outline row or a section header: filled, pointing right, rotated by its owner. */
export function IconDisclosure({ size = DEFAULT_SIZE, color = "currentColor", className, style }: IconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
            fill={color}
            className={className}
            style={style}
            aria-hidden="true"
        >
            <path d={TRIANGLE_PATH} />
        </svg>
    )
}
