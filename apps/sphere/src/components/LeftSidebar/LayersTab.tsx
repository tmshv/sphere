import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { ActionBar, type ActionBarOnClick } from "@sphere/ui"
import { Accordion } from "@mantine/core"
import { IconBulbOff, IconPlus } from "@tabler/icons"
import { useCallback, useState } from "react"
import { LayerPanel } from "../LayerPanel"
import { LayersOutline } from "../LayersOutline"
import { StyledAccordion } from "./StyledAccordion"

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

            <StyledAccordion value={value} onChange={setValue} pt={"sm"}>
                <Accordion.Item value={"outline"}>
                    <Accordion.Control>Outline</Accordion.Control>
                    <Accordion.Panel>
                        <LayersOutline />
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value={"layer-properties"}>
                    <Accordion.Control>Layer</Accordion.Control>
                    <Accordion.Panel>
                        <LayerPanel />
                    </Accordion.Panel>
                </Accordion.Item>
            </StyledAccordion>
        </>
    )
}
