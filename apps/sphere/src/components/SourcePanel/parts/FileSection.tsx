import { formatBytes, formatEpoch } from "@sphere/utils"
import type { FC } from "react"
import type { FileInfo } from "@/lib/source-reader"
import { PropertyList, type PropertyListItem } from "@sphere/ui"
import { PanelSection } from "./PanelSection"

export type FileSectionProps = {
    file: FileInfo | null | undefined
}

/** The file size, and when it was last modified if known. */
export function fileItems(file: FileInfo): PropertyListItem[] {
    const size = { name: "Size", value: formatBytes(file.size_bytes) }
    return file.modified ? [size, { name: "Modified", value: formatEpoch(file.modified) }] : [size]
}

export const FileSection: FC<FileSectionProps> = ({ file }) => {
    if (!file) {
        return null
    }
    return (
        <PanelSection title={"File"}>
            <PropertyList items={fileItems(file)} />
        </PanelSection>
    )
}
