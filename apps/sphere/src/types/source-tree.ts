import type { Id, SourceType } from "./index"

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

export type SourceLayerRef = {
    id: string
    name: string
}

export type SourceTreeInput = {
    id: Id
    name: string
    type: SourceType
    format?: string
    sourceLayers?: SourceLayerRef[]
}

export type SourceTree = {
    nodes: SourceNodes
    rootIds: Id[]
}
