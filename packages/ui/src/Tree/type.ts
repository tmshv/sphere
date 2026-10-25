import type { ReactNode } from "react"

export type TreeItem = {
    id: string
    label: string
    icon?: ReactNode
    extra?: ReactNode
    children?: TreeItem[]
}

export type TreeMove = {
    ids: string[]
    parentId?: string
    index: number
}
