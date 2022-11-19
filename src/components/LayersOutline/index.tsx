import { IconPolygon, IconPoint, IconLine, IconPlus, IconBulb, IconBulbOff, IconCross, IconPointOff } from '@tabler/icons';
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ActionIcon, Button, createStyles, Flex, NavLink, Text } from '@mantine/core';
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
    const { classes: s } = useStyle()
    const dispatch = useAppDispatch()
    const currentId = useAppSelector(selectCurrentLayer)
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
                } else {
                    icon = (
                        <IconPoint size={20} color={undefined} />
                    )
                }

                return (
                    <Flex gap={"sm"} align="center">
                        <NavLink
                            // h={20}
                            w={"100%"}
                            key={id}
                            styles={{
                                label: {
                                    // width: "auto",
                                    maxWidth: "220px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    // wordWrap: "unset",
                                    textOverflow: "ellipsis",
                                    display: 'block',
                                }
                            }}
                            className={s.button}
                            active={id === currentId}
                            label={name}
                            // label={(
                            //     <Text style={{
                            //         whiteSpace: "nowrap",
                            //         overflow: "hidden",
                            //         // wordWrap: "unset",
                            //         textOverflow: "ellipsis",
                            //     }}>{name}</Text>
                            // )}
                            // description={item.description}
                            // rightSection={item.rightSection}
                            icon={icon}
                            onClick={() => {
                                dispatch(actions.selection.selectLayer({
                                    layerId: id,
                                }))
                            }}
                            // color="cyan"
                            variant="filled"
                        />
                        <ActionIcon size={"md"} radius={"sm"} h={30} onClick={() => {
                            dispatch(actions.layer.setVisible({
                                id,
                                value: !visible,
                            }))
                        }}>
                            {visible ? (
                                <IconBulb size={16} color={"yellow"} />
                            ) : (
                                <IconBulbOff size={16} />
                            )}
                        </ActionIcon>
                    </Flex>
                )
            })}

            <Button
                size={"xs"}
                variant={"default"}
                leftIcon={(
                    <IconPlus size={16} />
                )}
                onClick={() => {
                    dispatch(actions.layer.addBlankLayer())
                }}
            //     rightIcon={(
            // )}
            >New layer</Button>
        </Flex>
    );
}
