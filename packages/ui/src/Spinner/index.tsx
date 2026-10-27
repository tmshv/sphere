import s from "./spinner.module.css"

const DEFAULT_LABEL = "Loading"

// Mantine's Loader size "xs", in px. The SVG paths below are drawn on a 38 x 38 viewBox.
const SIZE_PX = 18
const VIEW_BOX = "0 0 38 38"

export type SpinnerProps = {
    label?: string
}

// Mantine 5 Oval loader, verbatim apart from the stroke colour (a token, in CSS).
export function Spinner({ label = DEFAULT_LABEL }: SpinnerProps) {
    return (
        <span role={"status"} aria-label={label} className={s.spinner}>
            <svg
                className={s.oval}
                role={"presentation"}
                width={`${SIZE_PX}px`}
                height={`${SIZE_PX}px`}
                viewBox={VIEW_BOX}
                xmlns={"http://www.w3.org/2000/svg"}
            >
                <g fill={"none"} fillRule={"evenodd"}>
                    <g transform={"translate(2.5 2.5)"} strokeWidth={"5"}>
                        <circle strokeOpacity={".5"} cx={"16"} cy={"16"} r={"16"} />
                        <path d={"M32 16c0-9.94-8.06-16-16-16"}>
                            <animateTransform
                                attributeName={"transform"}
                                type={"rotate"}
                                from={"0 16 16"}
                                to={"360 16 16"}
                                dur={"1s"}
                                repeatCount={"indefinite"}
                            />
                        </path>
                    </g>
                </g>
            </svg>
        </span>
    )
}
