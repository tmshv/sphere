import { actions } from "@/store"
import { selectSidebarSections } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import type { SidebarSection } from "@/types"
import { ActionBar, type ActionBarOnClick, PanelBody, SectionStack } from "@sphere/ui"
import { IconBulbOff, IconPlus } from "@tabler/icons"
import { useCallback } from "react"
import { LayerPanel } from "../LayerPanel"
import { LayersOutline } from "../LayersOutline"

export const LayersTab: React.FC = () => {
    const dispatch = useAppDispatch()
    const sections = useAppSelector(selectSidebarSections("layers"))

    const onSectionsChange = useCallback(
        (next: SidebarSection[]) => {
            dispatch(actions.app.setSidebarSections({ tab: "layers", sections: next }))
        },
        [dispatch],
    )

    const onClick = useCallback<ActionBarOnClick>(
        name => {
            switch (name) {
                case "hide": {
                    break
                    //
                }
                case "new": {
                    dispatch(actions.layer.addBlankLayer())
                    break
                }
                default: {
                    break
                }
            }
        },
        [dispatch],
    )

    return (
        <>
            <ActionBar
                pl={"sm"}
                pr={"sm"}
                tooltipPosition={"top"}
                onClick={onClick}
                items={[
                    null,
                    {
                        name: "hide",
                        label: "Hide all layers",
                        icon: IconBulbOff,
                    },
                    {
                        name: "new",
                        label: "New layer",
                        icon: IconPlus,
                    },
                ]}
            />

            <SectionStack sections={sections} onSectionsChange={onSectionsChange}>
                <SectionStack.Section name={"outline"} title={"Outline"}>
                    <PanelBody>
                        <LayersOutline />
                    </PanelBody>
                </SectionStack.Section>

                <SectionStack.Section name={"layer-properties"} title={"Layer"}>
                    <LayerPanel />
                </SectionStack.Section>
            </SectionStack>
        </>
    )
}
