import { actions, selectors } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import logger from "@/logger"
import { SourceType } from "@/types"
import { ActionBar, type ActionBarOnClick } from "@/ui/ActionBar"
import { Accordion, Button, Group, Modal, TextInput } from "@mantine/core"
import { useForm } from "@mantine/form"
import { IconCrosshair, IconFile, IconLink, IconPlus, IconTrash } from "@tabler/icons"
import { useCallback, useState } from "react"
import { SourcePanel } from "../SourcePanel"
import { SourcesOutline } from "../SourcesOutline"
import { StyledAccordion } from "./StyledAccordion"

export const SourcesTab: React.FC = () => {
    const dispatch = useAppDispatch()
    const sourceId = useAppSelector(selectors.source.selectSelectedId)
    const [showModal, setShowModal] = useState(false)
    const [value, setValue] = useState<string[]>(["outline", "source-properties"])
    const form = useForm({
        initialValues: {
            url: "",
        },
    })

    const onClick = useCallback<ActionBarOnClick>(
        name => {
            switch (name) {
                case "trash": {
                    if (sourceId) dispatch(actions.source.removeSource(sourceId))
                    break
                }
                case "zoom": {
                    if (sourceId) dispatch(actions.source.zoomTo(sourceId))
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
                    dispatch(actions.source.new()).catch(err => {
                        logger.error("Failed to create new source: %s", err)
                    })
                    break
                }
                default: {
                    break
                }
            }
        },
        [dispatch, sourceId],
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
                        disabled: !sourceId,
                        icon: IconTrash,
                        color: "red",
                    },
                    {
                        name: "zoom",
                        label: "Zoom to source",
                        disabled: !sourceId,
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

            <StyledAccordion value={value} onChange={setValue} pt={"sm"}>
                <Accordion.Item value={"outline"}>
                    <Accordion.Control>Outline</Accordion.Control>
                    <Accordion.Panel>
                        <SourcesOutline />
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value={"source-properties"}>
                    <Accordion.Control>Source</Accordion.Control>
                    <Accordion.Panel>
                        <SourcePanel />
                    </Accordion.Panel>
                </Accordion.Item>
            </StyledAccordion>
        </>
    )
}
