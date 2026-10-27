import { space } from "../tokens"

export type Gap = "xxs" | "xs" | "sm" | "md"

export const GAP_PX: Record<Gap, number> = {
    xxs: space.xxs,
    xs: space.xs,
    sm: space.sm,
    md: space.md,
}
