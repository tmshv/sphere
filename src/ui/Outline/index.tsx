import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Card } from "./Card"
import { Flex } from "@mantine/core"
import { Fragment } from "react"

// export type OutlineOnMove = (dragIndex: number, hoverIndex: number) => void
export type OutlineOnMove<T> = (drag: T, hover: T) => void
export type OutlineRenderItem<T> = (item: T) => React.ReactNode

export type OutlineItem = {
    id: number | string
}

export type OutlineProps<T extends OutlineItem> = {
    items: T[]
    onMove: OutlineOnMove<T>
    renderItem: OutlineRenderItem<T>
    draggable?: boolean
}

export function Outline<T extends OutlineItem>({ items, onMove, renderItem, draggable = false }: OutlineProps<T>) {
    if (!draggable) {
        return (
            <Flex direction={"column"} gap="xs">
                {items.map((item, i) => (
                    <Fragment key={item.id}>
                        {renderItem(item)}
                    </Fragment>
                ))}
            </Flex>
        )
    }

    return (
        <DndProvider backend={HTML5Backend} key={1}>
            <Flex direction={"column"} gap="xs">
                {items.map((item, i) => (
                    <Card
                        key={item.id}
                        id={item.id}
                        index={i}
                        onMove={(dragIndex, hoverIndex) => {
                            const drag = items[dragIndex]
                            const hover = items[hoverIndex]
                            onMove(drag, hover)
                        }}
                    >
                        {renderItem(item)}
                    </Card>
                ))}
            </Flex>
        </DndProvider>
    )
}
