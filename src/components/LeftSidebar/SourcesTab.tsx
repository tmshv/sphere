import { actions } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Accordion } from '@mantine/core';
import { IconCrosshair, IconPlus, IconTrash } from '@tabler/icons';
import { useCallback, useState } from 'react';
import { ActionBar, ActionBarOnClick } from '@/ui/ActionBar';
import { StyledAccordion } from './StyledAccordion';
import { SourcesOutline } from '../SourcesOutline';
import { SourcePanel } from '../SourcePanel';

export const SourcesTab: React.FC = () => {
    const dispatch = useAppDispatch()
    const sourceId = useAppSelector(state => {
        return state.selection.sourceId
    })
    const [value, setValue] = useState<string[]>([]);

    const onClick = useCallback<ActionBarOnClick>(name => {
        switch (name) {
            case "trash": {
                dispatch(actions.source.removeSource(sourceId!))
                break
            }
            case "zoom": {
                dispatch(actions.source.zoomTo(sourceId!))
                break
            }
            case "new": {
                dispatch(actions.source.addFiles())
                break
            }
            default: {
            }
        }
    }, [sourceId])

    return (
        <>
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
                        name: "new",
                        label: "New source",
                        icon: IconPlus,
                    },
                ]}
            />

            <StyledAccordion
                value={value}
                onChange={setValue}
                pt={"sm"}
            >
                <Accordion.Item value={"outline"}>
                    <Accordion.Control>
                        Outline
                    </Accordion.Control>
                    <Accordion.Panel>
                        <SourcesOutline />
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value={"source-properties"}>
                    <Accordion.Control>
                        Source properties
                    </Accordion.Control>
                    <Accordion.Panel>
                        <SourcePanel />
                    </Accordion.Panel>
                </Accordion.Item>
            </StyledAccordion>
        </>
    );
}
