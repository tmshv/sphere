import { Box, Center, UnstyledButton, createStyles } from "@mantine/core"
import { IconChevronRight } from "@tabler/icons"
import type { MouseEvent } from "react"
import type { NodeRendererProps } from "react-arborist"
import type { TreeItem } from "./type"

export const EXPAND_LABEL = "Expand"
export const COLLAPSE_LABEL = "Collapse"
// Same chevron as a SectionStack header, so the tree's first level lines up under it
const CHEVRON_SIZE = 14
const ICON_BOX_SIZE = 30

const useStyles = createStyles(theme => ({
    // The whole row is the highlight, so a selected row reads as one band from edge to edge
    row: {
        height: "100%",
        cursor: "default",
        color: theme.colorScheme === "dark" ? theme.white : theme.black,
        fontSize: theme.fontSizes.xs,
        "&:hover": {
            backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
        },
    },
    // A soft tint rather than the filled accent: the row stays readable and the bulb stays visible
    selected: {
        backgroundColor: theme.fn.variant({ variant: "light", color: theme.primaryColor }).background,
        "&:hover": {
            backgroundColor: theme.fn.variant({ variant: "light", color: theme.primaryColor }).hover,
        },
    },
    // Same inset as a SectionStack header
    content: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.xs,
        height: "100%",
        paddingLeft: theme.spacing.sm,
        paddingRight: theme.spacing.xs,
    },
    chevron: {
        flexShrink: 0,
        display: "flex",
        width: CHEVRON_SIZE,
        color: "inherit",
    },
    chevronIcon: {
        transition: "transform 150ms ease",
    },
    chevronOpen: {
        transform: "rotate(90deg)",
    },
    label: {
        flex: 1,
        minWidth: 0,
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        overflow: "hidden",
    },
}))

function stopPropagation(event: MouseEvent) {
    event.stopPropagation()
}

export function TreeRow({ node, style, dragHandle }: NodeRendererProps<TreeItem>) {
    const { classes: s, cx } = useStyles()
    const { label, icon, extra, children } = node.data
    const hasChildren = (children ?? []).length > 0

    const onChevronClick = (event: MouseEvent) => {
        event.stopPropagation()
        node.toggle()
    }

    let chevron = <Box className={s.chevron} />
    if (hasChildren) {
        chevron = (
            <UnstyledButton
                className={s.chevron}
                aria-label={node.isOpen ? COLLAPSE_LABEL : EXPAND_LABEL}
                onClick={onChevronClick}
            >
                <IconChevronRight size={CHEVRON_SIZE} className={cx(s.chevronIcon, { [s.chevronOpen]: node.isOpen })} />
            </UnstyledButton>
        )
    }

    return (
        <Box
            ref={dragHandle}
            style={style}
            className={cx(s.row, { [s.selected]: node.isSelected })}
            data-selected={node.isSelected || undefined}
        >
            <Box className={s.content}>
                {chevron}
                {!icon ? null : (
                    <Center w={ICON_BOX_SIZE} h={ICON_BOX_SIZE}>
                        {icon}
                    </Center>
                )}
                <Box className={s.label}>{label}</Box>
                {extra === undefined ? null : <Box onClick={stopPropagation}>{extra}</Box>}
            </Box>
        </Box>
    )
}
