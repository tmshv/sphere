import React, { useCallback, useEffect, useRef, useState } from "react"
import { createStyles, Flex } from "@mantine/core"

const useStyle = createStyles(theme => ({
    container: {
        position: "relative",
        borderRight: `1px solid ${theme.colorScheme === "dark" ? theme.colors.gray[8] : theme.colors.gray[3]}`,
    },
    button: {
        position: "absolute",
        top: 0,
        right: -2,
        width: 4,
        height: "100%",
        zIndex: 1,

        "&:hover": {
            cursor: "col-resize",
        },
    },
}))

function clamp(value: number, min: number, max: number) {
    if (value < min) {
        return min
    }
    if (value > max) {
        return max
    }
    return value
}

export default function useHandler(startWidth: number, minWidth: number, maxWidth: number) {
    const ref = useRef<HTMLDivElement>(null)
    const refw = useRef<number>(0)
    const refx = useRef<number>(0)
    const [width, setWidth] = useState(startWidth)

    const up = useCallback((event: MouseEvent) => {
        refx.current = 0
    }, [])

    useEffect(() => {
        let w = startWidth

        const down = (event: MouseEvent) => {
            event.preventDefault()
            console.log("down")
            refx.current = event.pageX
            refw.current = w
        }
        const move = (event: MouseEvent) => {
            if (!refx.current) {
                return
            }

            w = clamp(refw.current - refx.current + event.pageX, minWidth, maxWidth)
            setWidth(w)
        }

        ref!.current!.addEventListener("mousedown", down)
        document.addEventListener("mouseup", up, true)
        document.addEventListener("mousemove", move, true)

        return () => {
            // ref!.current!.removeEventListener('mousedown', down);
            document.removeEventListener("mouseup", up, true)
            document.removeEventListener("mousemove", move, true)
        }
    }, [startWidth, minWidth, maxWidth])

    return { ref, width }
}

export type OnResize = (width: number) => void
export type SidebarProps = {
    startWidth: number
    minWidth: number
    maxWidth: number
    onResize?: OnResize
    children: React.ReactNode
}

export const Sidebar: React.FC<SidebarProps> = ({ children, startWidth, minWidth, maxWidth, onResize }) => {
    const { classes: s } = useStyle()
    const { ref, width } = useHandler(startWidth, minWidth, maxWidth)

    useEffect(() => {
        if (typeof onResize !== "function") {
            return
        }

        onResize(width)
    }, [width, onResize])

    return (
        <Flex
            pt={"xl"}
            p={0}
            w={width}
            className={s.container}
        >
            <div
                ref={ref}
                className={s.button}
            />
            {children}
        </Flex>
    )
}
