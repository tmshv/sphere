import { IconPolygon, IconPoint, IconLine, IconPlus, IconBulb, IconBulbOff, IconCross, IconPointOff, IconFlame } from '@tabler/icons';
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ActionIcon, Button, createStyles, Flex, NavLink, Text, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { LayerType } from "@/types";
import { actions } from "@/store";
import { selectCurrentLayer } from "@/store/selection";

const useStyle = createStyles(theme => ({
    button: {
        maxWidth: "100%",
        borderRadius: theme.radius.sm,
        height: 30,
        // padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
    }
}))

export const LayersOutline: React.FC = () => {
    const theme = useMantineTheme()
    const { classes: s } = useStyle()
    const dispatch = useAppDispatch()
    const layerId = useAppSelector(selectCurrentLayer)
    const items = useAppSelector(state => state.layer.allIds.map(id => {
        const item = state.layer.items[id]

        return {
            id,
            name: item.name,
            type: item.type,
            color: item.color,
            visible: item.visible,
        }
    }))

    return (
        <Flex direction={'column'} gap={'sm'} align={"stretch"}>
            {items.map(({ id, name, type, color, visible }) => {
                let icon: React.ReactNode = null

                if (type === LayerType.Point) {
                    icon = (
                        <IconPoint size={20} color={color} />
                    )
                } else if (type === LayerType.Line) {
                    icon = (
                        <IconLine size={20} color={color} />
                    )
                } else if (type === LayerType.Polygon) {
                    icon = (
                        <IconPolygon size={20} color={color} />
                    )
                } else if (type === LayerType.Heatmap) {
                    icon = (
                        <IconFlame size={20} color={color} />
                    )
                } else {
                    icon = (
                        <IconPoint size={20} color={undefined} />
                    )
                }

                return (
                    <Flex key={id} gap={"sm"} align="center">
                        <NavLink
                            w={"100%"}
                            key={id}
                            styles={{
                                label: {
                                    maxWidth: "220px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: 'block',
                                }
                            }}
                            className={s.button}
                            active={id === layerId}
                            label={name}
                            icon={icon}
                            onClick={() => {
                                dispatch(actions.selection.selectLayer({
                                    layerId: id,
                                }))
                            }}
                            variant="filled"
                        />
                        <ActionIcon size={"md"} radius={"sm"} h={30} onClick={() => {
                            dispatch(actions.layer.setVisible({
                                id,
                                value: !visible,
                            }))
                        }}>
                            {visible ? (
                                <IconBulb size={16}
                                    color={theme.colorScheme === "dark" ? "yellow" : undefined}
                                />
                            ) : (
                                <IconBulbOff size={16} />
                            )}
                        </ActionIcon>
                    </Flex>
                )
            })}
        </Flex>
    );
}
