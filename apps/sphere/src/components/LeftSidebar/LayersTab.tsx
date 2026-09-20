import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { ActionBar, type ActionBarOnClick, PanelBody, SectionStack } from "@sphere/ui"
import { IconBulbOff, IconPlus } from "@tabler/icons"
import { useCallback, useState } from "react"
import { LayerPanel } from "../LayerPanel"
import { LayersOutline } from "../LayersOutline"

export const LayersTab: React.FC = () => {
    const dispatch = useAppDispatch()
    const [value, setValue] = useState<string[]>(["outline", "layer-properties"])

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

            <SectionStack value={value} onChange={setValue}>
                <SectionStack.Section value={"outline"} title={"Outline"}>
                    <PanelBody>
                        <LayersOutline />
                    </PanelBody>
                </SectionStack.Section>

                <SectionStack.Section value={"layer-properties"} title={"Layer"}>
                    <LayerPanel />
                </SectionStack.Section>
            </SectionStack>
        </>
    )
}
