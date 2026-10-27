import { Autocomplete } from "@base-ui/react/autocomplete"
import { Dialog } from "@base-ui/react/dialog"
import { IconSearch } from "@sphere/icons"
import { type ReactNode, useRef, useState } from "react"
import { useHotkeys } from "../hooks"
import s from "./command-palette.module.css"
import { filterCommands } from "./filter"

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
// Mantine Spotlight `limit`.
const RESULT_LIMIT = 10
// Base UI reason for typing into the input; item presses and the like must not rewrite the query.
const INPUT_CHANGE = "input-change"

function commandTitle(command: Command): string {
    return command.title
}

export function CommandPalette({ commands, shortcut, placeholder, emptyMessage, children }: CommandPaletteProps) {
    const [opened, setOpened] = useState(false)
    const [query, setQuery] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const results = filterCommands(query, commands).slice(0, RESULT_LIMIT)

    // Mantine's SpotlightProvider registers its shortcut with the default useHotkeys options:
    // ignored inside inputs, textareas and selects, default action prevented.
    useHotkeys([[shortcut, () => setOpened(true)]])

    function handleOpenComplete(open: boolean) {
        if (!open) {
            setQuery("")
        }
    }

    function handleQuery(value: string, details: { reason: string }) {
        if (details.reason === INPUT_CHANGE) {
            setQuery(value)
        }
    }

    function run(command: Command) {
        command.onTrigger()
        setOpened(false)
    }

    return (
        <>
            <Dialog.Root open={opened} onOpenChange={setOpened} onOpenChangeComplete={handleOpenComplete}>
                <Dialog.Portal>
                    <Dialog.Backdrop className={s.backdrop} />
                    <Dialog.Viewport className={s.viewport}>
                        <Dialog.Popup className={s.popup} aria-label={placeholder} initialFocus={inputRef}>
                            <Autocomplete.Root
                                inline
                                open
                                autoHighlight
                                items={commands}
                                filteredItems={results}
                                value={query}
                                onValueChange={handleQuery}
                                itemToStringValue={commandTitle}
                            >
                                <div className={s.search}>
                                    <div className={s.searchIcon}>
                                        <IconSearch size={SEARCH_ICON_SIZE} />
                                    </div>
                                    <Autocomplete.Input
                                        ref={inputRef}
                                        className={s.searchInput}
                                        placeholder={placeholder}
                                        autoComplete="off"
                                        autoFocus
                                    />
                                </div>
                                {results.length > 0 ? (
                                    <Autocomplete.List className={s.actions}>
                                        {(command: Command) => (
                                            <Autocomplete.Item
                                                key={command.id}
                                                value={command}
                                                className={s.action}
                                                onClick={() => run(command)}
                                            >
                                                <div className={s.group}>
                                                    {command.icon ? (
                                                        <div className={s.actionIcon}>{command.icon}</div>
                                                    ) : null}
                                                    <div>
                                                        <div className={s.title}>{command.title}</div>
                                                        {command.description ? (
                                                            <div className={s.description}>{command.description}</div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </Autocomplete.Item>
                                        )}
                                    </Autocomplete.List>
                                ) : null}
                                {results.length === 0 && query.trim().length > 0 ? (
                                    <div className={s.actions}>
                                        <div className={s.nothingFound}>{emptyMessage}</div>
                                    </div>
                                ) : null}
                            </Autocomplete.Root>
                        </Dialog.Popup>
                    </Dialog.Viewport>
                </Dialog.Portal>
            </Dialog.Root>
            {children}
        </>
    )
}
