import { actions, selectors } from "@/store"
import { selectSidebarSections } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import logger from "@/logger"
import { SourceType } from "@/types"
import type { SidebarSection } from "@/types"
import { ActionBar, type ActionBarOnClick, Button, Dialog, SectionStack, TextField } from "@sphere/ui"
import { IconCrosshair, IconFile, IconLink, IconPlus, IconTrash } from "@sphere/icons"
import { type FormEvent, useCallback, useState } from "react"
import { SourcePanel } from "../SourcePanel"
import { SourcesOutline } from "../SourcesOutline"

export function SourcesTab() {
    const dispatch = useAppDispatch()
    // Source actions take the selected node id; which of them apply depends on the node kind
    const nodeId = useAppSelector(selectors.source.selectSelectedId)
    const { canRemove, canZoom } = useAppSelector(selectors.source.selectSelectedNodeActions)
    const sections = useAppSelector(selectSidebarSections("sources"))
    const [showModal, setShowModal] = useState(false)
    const [url, setUrl] = useState<string>("")

    const submitUrl = useCallback(() => {
        if (!url.trim()) {
            return
        }

        setShowModal(false)
        dispatch(actions.source.addFromUrl({ url, type: SourceType.Geojson }))
    }, [dispatch, url])

    const onUrlSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            submitUrl()
        },
        [submitUrl],
    )

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
            <Dialog
                opened={showModal}
                onClose={() => setShowModal(false)}
                title="Input URL"
                footer={<Button onClick={submitUrl}>Submit</Button>}
            >
                <form onSubmit={onUrlSubmit}>
                    <TextField label="URL" placeholder="https://..." required value={url} onChange={setUrl} />
                </form>
            </Dialog>

            <ActionBar
                padded
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
                    {/* No PanelBody: the tree rows carry the inset themselves so a selected row spans the full width */}
                    <SourcesOutline />
                </SectionStack.Section>

                <SectionStack.Section name={"source-properties"} title={"Source"}>
                    <SourcePanel />
                </SectionStack.Section>
            </SectionStack>
        </>
    )
}
