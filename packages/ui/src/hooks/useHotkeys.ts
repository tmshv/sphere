import { useHotkeys as useMantineHotkeys } from "@mantine/hooks"

export type HotkeyBinding = [string, (event: KeyboardEvent) => void]

export function useHotkeys(bindings: ReadonlyArray<HotkeyBinding>): void {
    useMantineHotkeys([...bindings])
}
