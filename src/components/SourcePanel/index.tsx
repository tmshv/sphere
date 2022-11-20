import { Badge, Button, Flex, Select } from "@mantine/core";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { IconPolygon, IconPoint, IconLine } from '@tabler/icons';
import { useMantineTheme } from '@mantine/core';
import { SourceType } from "../../types";
import { actions } from "@/store";

export const SourcePanel: React.FC = () => {
    const dispatch = useAppDispatch()
    const source = useAppSelector(state => {
        const id = state.selection.sourceId
        if (!id) {
            return
        }

        const source = state.source.items[id]
        if (!source) {
            return
        }

        return {
            id,
            name: source.dataset.name,
            type: source.dataset.type,
        }
    })
    const theme = useMantineTheme();
    const getColor = (color: string) => theme.colors[color][theme.colorScheme === 'dark' ? 5 : 7];

    if (!source) {
        return null
    }

    // sources.map(source => {
    let icon: React.ReactNode = null

    if (source.type === SourceType.Points) {
        icon = (
            <IconPoint size={20} color={getColor('blue')} />
        )
    }
    if (source.type === SourceType.Lines) {
        icon = (
            <IconLine size={20} color={getColor('blue')} />
        )
    }
    if (source.type === SourceType.Polygons) {
        icon = (
            <IconPolygon size={20} color={getColor('blue')} />
        )
    }
    return (
        <Flex pt={"md"} direction={"column"} gap={"md"} align={"flex-start"}>
            <Badge radius={"sm"}>
                {source.type}
            </Badge>

            <Select
                label="Type"
                placeholder="Pick one"
                value={source.type}
                data={[
                    { value: SourceType.Points, label: 'Point' },
                    { value: SourceType.Lines, label: 'Line' },
                    { value: SourceType.Polygons, label: 'Polygon' },
                ]}
                onChange={value => {
                    if (value) {
                        // dispatch(actions.layer.setType({
                        //     id,
                        //     type: value as LayerType
                        // }))
                    }
                }}
            />
            <Button
                size="sm"
                color={"red"}
                onClick={() => {
                    dispatch(actions.source.removeSource(source.id))
                }}
            >Delete</Button>
            <Button
                size="sm"
                onClick={() => {
                    dispatch(actions.source.zoomTo(source.id))
                }}
            >Zoom</Button>
        </Flex>
    )
}
