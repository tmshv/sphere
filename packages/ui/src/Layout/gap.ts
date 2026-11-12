import { space } from "../tokens"

export type Gap = "xxs" | "xs" | "sm" | "md"

// The gap names Row and Stack take, on the desktop space scale (px).
export const GAP_PX: Record<Gap, number> = {
    xxs: space[2],
    xs: space[4],
    sm: space[12],
    md: space[16],
}
