import type { Command } from "."

// Mantine 5 Spotlight filterActions: case-insensitive substring match on the trimmed query;
// title matches come first, then description matches, each in the original order.
export function filterCommands(query: string, commands: ReadonlyArray<Command>): Command[] {
    const needle = query.trim().toLowerCase()
    const byTitle = commands.filter(command => command.title.toLowerCase().includes(needle))
    const byDescription = commands.filter(
        command => !byTitle.includes(command) && command.description?.toLowerCase().includes(needle),
    )
    return [...byTitle, ...byDescription]
}
