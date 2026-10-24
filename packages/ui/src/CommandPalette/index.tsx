import { SpotlightProvider } from "@mantine/spotlight"
import { IconSearch } from "@tabler/icons"
import type { ReactNode } from "react"

export type Command = {
    id: string
    title: string
    description?: string
    icon?: ReactNode
    onTrigger(): void
}

export type CommandPaletteProps = {
    commands: ReadonlyArray<Command>
    shortcut: string
    placeholder: string
    emptyMessage: string
    children: ReactNode
}

const SEARCH_ICON_SIZE = 18

export function CommandPalette({ commands, shortcut, placeholder, emptyMessage, children }: CommandPaletteProps) {
    const actions = commands.map(({ id, title, description, icon, onTrigger }) => ({
        id,
        title,
        description,
        icon,
        onTrigger: () => onTrigger(),
    }))

    return (
        <SpotlightProvider
            actions={actions}
            searchIcon={<IconSearch size={SEARCH_ICON_SIZE} />}
            searchPlaceholder={placeholder}
            shortcut={shortcut}
            nothingFoundMessage={emptyMessage}
        >
            {children}
        </SpotlightProvider>
    )
}
