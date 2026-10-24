import { Stack } from "@mantine/core"
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { InfoRow } from "@sphere/ui"
import { PanelSection } from "./parts/PanelSection"

export function FolderPanel() {
    const node = useAppSelector(selectors.source.selectSelectedNode)

    if (node?.kind !== "folder") {
        return null
    }

    return (
        <Stack spacing={"md"}>
            <PanelSection title={"Folder"}>
                <InfoRow label={"Items"} value={String(node.children.length)} />
            </PanelSection>
        </Stack>
    )
}
