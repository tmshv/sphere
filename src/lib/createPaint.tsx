import { CirclePaint, FillPaint, LinePaint } from "mapbox-gl";
import { MantineTheme, useMantineTheme } from "@mantine/core";

export function createFillPaint<Key extends string>(
    factory: (colors: MantineTheme["colors"]) => Record<Key, FillPaint>
) {
    function usePaint() {
        const theme = useMantineTheme();

        return factory(theme.colors)
    }

    return usePaint
}

export function createLinePaint<Key extends string>(
    factory: (colors: MantineTheme["colors"]) => Record<Key, LinePaint>
) {
    function usePaint() {
        const theme = useMantineTheme();

        return factory(theme.colors)
    }

    return usePaint
}

export function createCirclePaint<Key extends string>(
    factory: (colors: MantineTheme["colors"]) => Record<Key, CirclePaint>
) {
    function usePaint() {
        const theme = useMantineTheme();

        return factory(theme.colors)
    }

    return usePaint
}
