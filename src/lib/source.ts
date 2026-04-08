import type { Source } from "@/types/source"
import { SourceType } from "@/types"

export function isMvtSource(source: Source | undefined): boolean {
    return source?.type === SourceType.MVT
}
