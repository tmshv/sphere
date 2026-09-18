import { formatBytes, formatEpoch } from "@sphere/utils"
import type { FC } from "react"
import type { FileInfo } from "@/lib/source-reader"
import { InfoRow } from "./InfoRow"
import { PanelSection } from "./PanelSection"

export type FileSectionProps = {
    file: FileInfo | null | undefined
}

export const FileSection: FC<FileSectionProps> = ({ file }) => {
    if (!file) {
        return null
    }
    return (
        <PanelSection title={"File"}>
            <InfoRow label={"Size"} value={formatBytes(file.size_bytes)} />
            {file.modified ? <InfoRow label={"Modified"} value={formatEpoch(file.modified)} /> : null}
        </PanelSection>
    )
}
