import { legacyScales } from "../tokens"

export type Gap = "xxs" | "xs" | "sm" | "md"

const { space } = legacyScales

export const GAP_PX: Record<Gap, number> = {
    xxs: space.xxs,
    xs: space.xs,
    sm: space.sm,
    md: space.md,
}
