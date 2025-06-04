import { CirclePaintProps, FillPaintProps, LinePaintProps } from "maplibre-gl"
import { MantineTheme, useMantineTheme } from "@mantine/core"

export function createFillPaint<Key extends string>(
    factory: (colors: MantineTheme["colors"]) => Record<Key, FillPaintProps>,
) {
    function usePaint() {
        const theme = useMantineTheme()

        return factory(theme.colors)
    }

    return usePaint
}

export function createLinePaint<Key extends string>(
    factory: (colors: MantineTheme["colors"]) => Record<Key, LinePaintProps>,
) {
    function usePaint() {
        const theme = useMantineTheme()

        return factory(theme.colors)
    }

    return usePaint
}

export function createCirclePaint<Key extends string>(
    factory: (colors: MantineTheme["colors"]) => Record<Key, CirclePaintProps>,
) {
    function usePaint() {
        const theme = useMantineTheme()

        return factory(theme.colors)
    }

    return usePaint
}
