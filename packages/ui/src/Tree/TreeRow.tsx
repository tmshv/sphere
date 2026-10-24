import { ActionIcon, Box, Flex } from "@mantine/core"
import { IconChevronDown, IconChevronRight } from "@tabler/icons"
import type { MouseEvent } from "react"
import type { NodeRendererProps } from "react-arborist"
import { OutlineItem } from "../Outline/OutlineItem"
import type { TreeItem } from "./type"

export const EXPAND_LABEL = "Expand"
export const COLLAPSE_LABEL = "Collapse"
const CHEVRON_BOX_SIZE = 22
const CHEVRON_ICON_SIZE = 14

function stopPropagation(event: MouseEvent) {
    event.stopPropagation()
}

export function TreeRow({ node, style, dragHandle }: NodeRendererProps<TreeItem>) {
    const { label, icon, extra, children } = node.data
    const hasChildren = (children ?? []).length > 0

    const onChevronClick = (event: MouseEvent) => {
        event.stopPropagation()
        node.toggle()
    }

    let chevron = <Box w={CHEVRON_BOX_SIZE} />
    if (hasChildren) {
        chevron = (
            <ActionIcon
                size={CHEVRON_BOX_SIZE}
                aria-label={node.isOpen ? COLLAPSE_LABEL : EXPAND_LABEL}
                onClick={onChevronClick}
            >
                {node.isOpen ? (
                    <IconChevronDown size={CHEVRON_ICON_SIZE} />
                ) : (
                    <IconChevronRight size={CHEVRON_ICON_SIZE} />
                )}
            </ActionIcon>
        )
    }

    return (
        <Flex ref={dragHandle} style={style} align={"center"} h={"100%"}>
            {chevron}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <OutlineItem
                    label={label}
                    icon={icon}
                    active={node.isSelected}
                    extra={extra === undefined ? undefined : <Box onClick={stopPropagation}>{extra}</Box>}
                />
            </Box>
        </Flex>
    )
}
