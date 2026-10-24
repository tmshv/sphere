import { actions, selectors } from "@/store"
import { selectSidebarSections } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import logger from "@/logger"
import { SourceType } from "@/types"
import type { SidebarSection } from "@/types"
import { ActionBar, type ActionBarOnClick, PanelBody, SectionStack } from "@sphere/ui"
import { Button, Group, Modal, TextInput } from "@mantine/core"
import { useForm } from "@mantine/form"
import { IconCrosshair, IconFile, IconLink, IconPlus, IconTrash } from "@tabler/icons"
import { useCallback, useState } from "react"
import { SourcePanel } from "../SourcePanel"
import { SourcesOutline } from "../SourcesOutline"

export const SourcesTab: React.FC = () => {
    const dispatch = useAppDispatch()
    // Source actions take the selected node id; which of them apply depends on the node kind
    const nodeId = useAppSelector(selectors.source.selectSelectedId)
    const { canRemove, canZoom } = useAppSelector(selectors.source.selectSelectedNodeActions)
    const sections = useAppSelector(selectSidebarSections("sources"))
    const [showModal, setShowModal] = useState(false)
    const form = useForm({
        initialValues: {
            url: "",
        },
    })

    const onSectionsChange = useCallback(
        (next: SidebarSection[]) => {
            dispatch(actions.app.setSidebarSections({ tab: "sources", sections: next }))
        },
        [dispatch],
    )

    const onClick = useCallback<ActionBarOnClick>(
        name => {
            switch (name) {
                case "trash": {
                    if (nodeId && canRemove) dispatch(actions.source.removeSource(nodeId))
                    break
                }
                case "zoom": {
                    if (nodeId && canZoom) dispatch(actions.source.zoomTo(nodeId))
                    break
                }
                case "add-from-url": {
                    setShowModal(true)
                    break
                }
                case "open-file": {
                    dispatch(actions.openFiles())
                    break
                }
                case "new": {
                    dispatch(actions.source.new()).catch((err: unknown) => {
                        logger.error("Failed to create new source: %s", err)
                    })
                    break
                }
                default: {
                    break
                }
            }
        },
        [dispatch, nodeId, canRemove, canZoom],
    )

    return (
        <>
            <Modal centered opened={showModal} onClose={() => setShowModal(false)} title="Input URL" size={"md"}>
                <form
                    onSubmit={form.onSubmit(values => {
                        setShowModal(false)

                        dispatch(
                            actions.source.addFromUrl({
                                url: values.url,
                                type: SourceType.Geojson,
                            }),
                        )
                    })}
                >
                    <TextInput
                        withAsterisk
                        label="URL"
                        size="xs"
                        placeholder="https://..."
                        {...form.getInputProps("url")}
                    />

                    <Group position="right" mt="md">
                        <Button type="submit" size={"xs"}>
                            Submit
                        </Button>
                    </Group>
                </form>
            </Modal>

            <ActionBar
                pl={"sm"}
                pr={"sm"}
                tooltipPosition={"top"}
                onClick={onClick}
                items={[
                    {
                        name: "trash",
                        label: "Delete source",
                        disabled: !canRemove,
                        icon: IconTrash,
                        color: "red",
                    },
                    {
                        name: "zoom",
                        label: "Zoom to source",
                        disabled: !canZoom,
                        icon: IconCrosshair,
                    },
                    null,
                    {
                        name: "add-from-url",
                        label: "Add from URL",
                        icon: IconLink,
                    },
                    {
                        name: "open-file",
                        label: "Open file",
                        icon: IconFile,
                    },
                    {
                        name: "new",
                        label: "New source",
                        icon: IconPlus,
                    },
                ]}
            />

            <SectionStack sections={sections} onSectionsChange={onSectionsChange}>
                <SectionStack.Section name={"outline"} title={"Outline"}>
                    <PanelBody>
                        <SourcesOutline />
                    </PanelBody>
                </SectionStack.Section>

                <SectionStack.Section name={"source-properties"} title={"Source"}>
                    <SourcePanel />
                </SectionStack.Section>
            </SectionStack>
        </>
    )
}
