import type { Id } from "./index"

type SourceNodeBase = {
    id: Id
    name: string
    parentId?: Id
    visible: boolean
    children: Id[]
}

export type SourceNode =
    | (SourceNodeBase & { kind: "source" })
    | (SourceNodeBase & { kind: "source-layer"; sourceLayer: string })
    | (SourceNodeBase & { kind: "folder" })

export type SourceNodeKind = SourceNode["kind"]

export type SourceNodes = Record<Id, SourceNode>

export type SelectedSourceRef = {
    nodeId: Id
    sourceId?: Id
    sourceLayer?: string
}
