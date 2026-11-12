import inputClasses from "./input.module.css"
import menuClasses from "./menu.module.css"
import segmentedClasses from "./segmented.module.css"

export { ButtonBase } from "./ButtonBase"
export type { ButtonBaseProps, ButtonShape, ButtonSize, ButtonTone } from "./ButtonBase"
export { Badge } from "./Badge"
export type { BadgeProps, BadgeRadius, BadgeSize, BadgeVariant } from "./Badge"
export { Tooltip } from "./Tooltip"
export type { TooltipProps, TooltipSide } from "./Tooltip"
export { Skeleton } from "./Skeleton"
export type { SkeletonProps } from "./Skeleton"
export { ValueImage } from "./ValueImage"
export type { ValueImageProps, ValueImageSize } from "./ValueImage"

// The shared field look (root, label, wrapper, input, right section) for TextField, Select, ColorField and
// SliderField.
export const input = inputClasses

// The menu surface (surface, item, itemIcon, itemLabel, itemShortcut, itemCheck, separator, label) for
// ContextMenu, the Select list and the CommandPalette results.
export const menu = menuClasses

export { cx } from "./cx"

// The segmented look (group, segment, text) for SegmentedControl and Tabs.
export const segmented = segmentedClasses
