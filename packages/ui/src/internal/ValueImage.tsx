import s from "./value-image.module.css"

export type ValueImageSize = "small" | "large"

export type ValueImageProps = {
    src: string
    alt: string
    size: ValueImageSize
}

const SIZE_CLASS: Record<ValueImageSize, string> = {
    small: s.small,
    large: s.large,
}

/** A square, cropped image in a figure: the photo a property value points at. */
export function ValueImage({ src, alt, size }: ValueImageProps) {
    return (
        <div className={`${s.image} ${SIZE_CLASS[size]}`}>
            <figure className={s.figure}>
                <div className={s.wrapper}>
                    <img className={s.img} src={src} alt={alt} />
                </div>
            </figure>
        </div>
    )
}
