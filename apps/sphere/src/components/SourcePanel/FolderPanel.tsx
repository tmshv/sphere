import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { PropertyList, Stack } from "@sphere/ui"
import { PanelSection } from "./parts/PanelSection"

export function FolderPanel() {
    const node = useAppSelector(selectors.source.selectSelectedNode)

    if (node?.kind !== "folder") {
        return null
    }

    return (
        <Stack gap={"md"}>
            <PanelSection title={"Folder"}>
                <PropertyList items={[{ name: "Items", value: node.children.length }]} />
            </PanelSection>
        </Stack>
    )
}
