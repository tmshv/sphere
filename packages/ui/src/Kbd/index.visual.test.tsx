import { visualCases } from "../visual/visualCases"
import { Kbd, KbdShortcut } from "."

visualCases("Kbd", {
    keys: {
        render: () => (
            <>
                <Kbd>⌘</Kbd> <Kbd>Esc</Kbd> <Kbd>K</Kbd>
            </>
        ),
    },
    shortcut: { render: () => <KbdShortcut keys={["⌘", "⇧", "K"]} /> },
})
