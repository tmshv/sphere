import { Autocomplete } from "@base-ui/react/autocomplete"
import { Dialog } from "@base-ui/react/dialog"
import { IconSearch } from "@sphere/icons"
import { type ReactNode, useRef, useState } from "react"
import { useHotkeys } from "../hooks"
import { menu } from "../internal"
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

const SEARCH_ICON_SIZE = 14
// At most this many results show at once.
const RESULT_LIMIT = 10
// Base UI reason for typing into the input; item presses and the like must not rewrite the query.
const INPUT_CHANGE = "input-change"

function commandTitle(command: Command): string {
    return command.title
}

function join(classes: ReadonlyArray<string>): string {
    return classes.join(" ")
}

// A Spotlight-like palette: the menu surface with a pill search field over the results, which are menu items.
// No scrim; it fades in and out.
export function CommandPalette({ commands, shortcut, placeholder, emptyMessage, children }: CommandPaletteProps) {
    const [opened, setOpened] = useState(false)
    const [query, setQuery] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const results = filterCommands(query, commands).slice(0, RESULT_LIMIT)
    const nothingFound = results.length === 0 && query.trim().length > 0

    // The shortcut is ignored inside inputs, textareas and selects, and its default action is prevented.
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
                        <Dialog.Popup
                            className={join([menu.surface, s.popup])}
                            aria-label={placeholder}
                            initialFocus={inputRef}
                        >
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
                                    <span className={s.searchIcon}>
                                        <IconSearch size={SEARCH_ICON_SIZE} />
                                    </span>
                                    <Autocomplete.Input
                                        ref={inputRef}
                                        className={s.searchInput}
                                        placeholder={placeholder}
                                        autoComplete="off"
                                        autoFocus
                                    />
                                </div>
                                {results.length > 0 ? (
                                    <>
                                        <div className={menu.separator} aria-hidden="true" />
                                        <Autocomplete.List>
                                            {(command: Command) => (
                                                <Autocomplete.Item
                                                    key={command.id}
                                                    value={command}
                                                    className={menu.item}
                                                    onClick={() => run(command)}
                                                >
                                                    {command.icon ? (
                                                        <span className={menu.itemIcon}>{command.icon}</span>
                                                    ) : null}
                                                    <span className={menu.itemLabel}>{command.title}</span>
                                                    {command.description ? (
                                                        <span className={menu.itemShortcut}>{command.description}</span>
                                                    ) : null}
                                                </Autocomplete.Item>
                                            )}
                                        </Autocomplete.List>
                                    </>
                                ) : null}
                                {nothingFound ? (
                                    <>
                                        <div className={menu.separator} aria-hidden="true" />
                                        <div className={s.nothingFound}>{emptyMessage}</div>
                                    </>
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
