import { useMemo } from "react"
import { Bar } from "@visx/shape"
import { Group } from "@visx/group"
import { scaleLinear } from "@visx/scale"

const verticalMargin = 0

export type BarsProps = {
    min?: number
    max?: number
    data: number[]
    width: number;
    height: number;
    color: string
};

export const BarChart: React.FC<BarsProps> = ({ data, min, max, width, height, color }) => {
    const radius = 3
    // bounds
    const xMax = width
    const yMax = height - verticalMargin

    const size = data.length
    const minValue = min ?? Math.min(...data)
    const maxValue = max ?? Math.max(...data)
    const barWidth = (xMax - radius - radius) / size

    const xScale = useMemo(() => scaleLinear<number>({
        range: [radius, xMax-radius],
        round: true,
        domain: [0, size],
    }), [yMax, size, radius])
    const yScale = useMemo(() => scaleLinear<number>({
        range: [yMax, 0],
        round: true,
        domain: [minValue, maxValue],
    }), [minValue, maxValue, yMax])

    return width < 10 ? null : (
        <svg width={width} height={height}>
            <rect width={width} height={height} fill={color} opacity={0.25} rx={radius} />

            <Group top={verticalMargin / 2}>
                {data.map((d, i) => {
                    const barHeight = yMax - yScale(d)
                    const barX = xScale(i)
                    const barY = yMax - barHeight
                    return (
                        <Bar
                            key={i}
                            x={barX}
                            y={barY}
                            width={barWidth}
                            height={barHeight}
                            fill={color}
                        />
                    )
                })}
            </Group>
        </svg>
    )
}
