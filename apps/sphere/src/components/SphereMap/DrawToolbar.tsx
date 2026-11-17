import { actions, selectors } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import type { DrawActionable, DrawTool, DrawToolbarAction, Id } from "@/types"
import { IconArrowsJoin2, IconArrowsSplit2, IconLine, IconPoint, IconPolygon, IconTrash } from "@sphere/icons"
import { Button, IconButton, Row } from "@sphere/ui"
import type { CSSProperties, ReactNode } from "react"

const ICON_SIZE = 16

// A fieldset is the group element; it draws a border and padding by default
const GROUP_RESET: CSSProperties = { border: 0, margin: 0, padding: 0, minWidth: 0 }

type ToolButton = {
    tool: DrawTool
    label: string
    icon: ReactNode
}

// The title names the key that starts the tool too
const TOOLS: ReadonlyArray<ToolButton> = [
    { tool: "point", label: "Point (1)", icon: <IconPoint size={ICON_SIZE} /> },
    { tool: "line", label: "Line (2)", icon: <IconLine size={ICON_SIZE} /> },
    { tool: "polygon", label: "Polygon (3)", icon: <IconPolygon size={ICON_SIZE} /> },
]

type EditButton = {
    action: Exclude<DrawToolbarAction, DrawTool>
    label: string
    icon: ReactNode
    // The flag of `draw.actionable` that tells whether the action applies
    actionable: keyof DrawActionable
}

const EDITS: ReadonlyArray<EditButton> = [
    { action: "trash", label: "Delete", icon: <IconTrash size={ICON_SIZE} />, actionable: "trash" },
    { action: "combine", label: "Combine", icon: <IconArrowsJoin2 size={ICON_SIZE} />, actionable: "combineFeatures" },
    {
        action: "uncombine",
        label: "Uncombine",
        icon: <IconArrowsSplit2 size={ICON_SIZE} />,
        actionable: "uncombineFeatures",
    },
]

export type DrawToolbarProps = {
    sourceId: Id
    // A load or a session end runs: every tool and Done wait for it
    blocked: boolean
    // A commit or rollback runs: Cancel waits for it too
    pending: boolean
}

/**
 * The draw toolbar at the bottom of the map: the creation tools (the one in use pressed), the edit
 * actions that apply to draw's selection, then Cancel and Done. A press is a request; the
 * draw-toolbar listener runs it on the draw control, and a press on the pressed tool cancels it.
 */
export function DrawToolbar({ sourceId, blocked, pending }: DrawToolbarProps) {
    const dispatch = useAppDispatch()
    const activeTool = useAppSelector(selectors.draw.activeTool)
    const actionable = useAppSelector(selectors.draw.actionable)

    function press(action: DrawToolbarAction) {
        dispatch(actions.draw.toolbar({ sourceId, action }))
    }

    return (
        <div role="toolbar" aria-label="Draw">
            <Row gap="sm">
                <fieldset aria-label="Tools" style={GROUP_RESET}>
                    <Row gap="xxs">
                        {TOOLS.map(({ tool, label, icon }) => (
                            <IconButton
                                key={tool}
                                variant="bordered"
                                icon={icon}
                                label={label}
                                active={tool === activeTool}
                                disabled={blocked}
                                onClick={() => press(tool)}
                            />
                        ))}
                    </Row>
                </fieldset>
                <Row gap="xxs">
                    {EDITS.map(edit => (
                        <IconButton
                            key={edit.action}
                            variant="bordered"
                            icon={edit.icon}
                            label={edit.label}
                            disabled={blocked || !actionable[edit.actionable]}
                            onClick={() => press(edit.action)}
                        />
                    ))}
                </Row>
                <Row gap="xs">
                    <Button
                        variant="secondary"
                        onClick={() => dispatch(actions.draw.cancel({ sourceId }))}
                        disabled={pending}
                    >
                        Cancel
                    </Button>
                    <Button onClick={() => dispatch(actions.draw.commit({ sourceId }))} disabled={blocked}>
                        Done
                    </Button>
                </Row>
            </Row>
        </div>
    )
}
