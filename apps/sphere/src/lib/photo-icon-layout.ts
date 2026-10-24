import type { PhotoIconLayout } from "@/store/layer"

const PHOTO_ICON_LAYOUTS: ReadonlyArray<unknown> = ["circle", "square"] satisfies PhotoIconLayout[]

export function isPhotoIconLayout(value: unknown): value is PhotoIconLayout {
    return PHOTO_ICON_LAYOUTS.includes(value)
}
