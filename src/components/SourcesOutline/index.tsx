import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { IconPolygon, IconPoint, IconLine } from '@tabler/icons';
import { Box, NavLink, useMantineTheme } from '@mantine/core';
import { SourceType } from "../../types";
import { actions } from "@/store";
import { selectCurrentSource } from "@/store/selection";
// import { NavbarLink, SideMenu } from "@/ui/SideMenu";

export const SourcesOutline: React.FC = () => {
    const dispatch = useAppDispatch()
    const currentId = useAppSelector(selectCurrentSource)
    const sources = useAppSelector(state => state.source.allIds.map(id => {
        const s = state.source.items[id].dataset

        return {
            id,
            name: s.name,
            type: s.type,
        }
    }))
    const theme = useMantineTheme();
    const getColor = (color: string) => theme.colors[color][theme.colorScheme === 'dark' ? 5 : 7];


    return (
        <Box>
            {sources.map(item => {
                let icon: React.ReactNode = null

                if (item.type === SourceType.Points) {
                    icon = (
                        <IconPoint size={20} color={getColor('blue')} />
                    )
                }
                if (item.type === SourceType.Lines) {
                    icon = (
                        <IconLine size={20} color={getColor('blue')} />
                    )
                }
                if (item.type === SourceType.Polygons) {
                    icon = (
                        <IconPolygon size={20} color={getColor('blue')} />
                    )
                }

                return (
                    <NavLink
                        key={item.id}
                        active={item.id === currentId}
                        label={item.name}
                        // description={item.description}
                        // rightSection={item.rightSection}
                        icon={
                            // <item.icon size={16} stroke={1.5} />
                            // <IconPoint size={20} color={getColor('blue')} />
                            icon
                        }
                        onClick={() => {
                            dispatch(actions.selection.selectSource({
                                sourceId: item.id,
                            }))
                        }}
                        // color="cyan"
                        variant="filled"
                    />
                )
            })}
        </Box>
    );
    // return (
    //     <SideMenu>
    //         {sources.map(source => {
    //             let icon: React.ReactNode = null

    //             if (source.type === SourceType.Points) {
    //                 icon = (
    //                     <IconPoint size={20} color={getColor('blue')} />
    //                 )
    //             }
    //             if (source.type === SourceType.Lines) {
    //                 icon = (
    //                     <IconLine size={20} color={getColor('blue')} />
    //                 )
    //             }
    //             if (source.type === SourceType.Polygons) {
    //                 icon = (
    //                     <IconPolygon size={20} color={getColor('blue')} />
    //                 )
    //             }

    //             return (
    //                 <NavbarLink
    //                     label={source.name}
    //                     key={source.id}
    //                     // icon={icon}
    //                     icon={IconPolygon}
    //                 >
    //                     {/* // active={index === active} */}
    //                     {/* // onClick={() => setActive(index)} */}
    //                     {/* <Button
    //                     leftIcon={icon}
    //                     value={source.id}
    //                     key={source.id}
    //                 > */}
    //                     {source.name}
    //                 </NavbarLink>
    //             )
    //         })}
    //     </SideMenu>
    // )
}
