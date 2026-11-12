import { forwardRef } from "react"
import type { IconComponent } from "../tabler"

const DEFAULT_SIZE = 24
const VIEW_BOX_SIZE = 10
// A right-pointing triangle with its tip at mid-height, inset so the rotated glyph stays inside the box.
const TRIANGLE_PATH = "M2.5 1 L8 5 L2.5 9 Z"

/**
 * The disclosure triangle of an outline row or a section header: filled, pointing right, rotated by its owner.
 * Takes the props of a vendor icon; `stroke` is passed on as the stroke width, which a filled glyph never paints.
 * Without a `title` it is decorative and hidden from assistive technology unless the caller passes `aria-hidden`.
 */
export const IconDisclosure: IconComponent = forwardRef(function IconDisclosure(
    { size = DEFAULT_SIZE, color = "currentColor", stroke, title, children, ...rest },
    ref,
) {
    const svgProps = {
        ref,
        xmlns: "http://www.w3.org/2000/svg",
        width: size,
        height: size,
        viewBox: `0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`,
        fill: color,
        strokeWidth: stroke,
        ...rest,
    }

    if (!title) {
        return (
            <svg aria-hidden="true" {...svgProps}>
                <path d={TRIANGLE_PATH} />
                {children}
            </svg>
        )
    }

    return (
        <svg {...svgProps}>
            <title>{title}</title>
            <path d={TRIANGLE_PATH} />
            {children}
        </svg>
    )
})
