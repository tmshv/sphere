import { type RefCallback, useEffect, useState } from "react"

export type ElementSize = {
    width: number
    height: number
}

const EMPTY_SIZE: ElementSize = { width: 0, height: 0 }

export type UseElementSize<T extends Element> = ElementSize & {
    ref: RefCallback<T>
}

/** Measures an element and follows its size with ResizeObserver when the environment has one. */
export function useElementSize<T extends Element>(): UseElementSize<T> {
    const [element, setElement] = useState<T | null>(null)
    const [size, setSize] = useState<ElementSize>(EMPTY_SIZE)

    useEffect(() => {
        if (!element) {
            return
        }
        const rect = element.getBoundingClientRect()
        setSize({ width: rect.width, height: rect.height })

        if (typeof ResizeObserver === "undefined") {
            return
        }
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
            }
        })
        observer.observe(element)
        return () => observer.disconnect()
    }, [element])

    return { ref: setElement, ...size }
}
