import { page } from "vitest/browser"
import { Button } from "../Button"
import { TextField } from "../TextField"
import { visualCases } from "../visual/visualCases"
import { Dialog } from "."

const noop = () => {}

async function waitForDialog() {
    await expect.element(page.getByRole("dialog")).toBeVisible()
}

visualCases("Dialog", {
    "open-with-footer": {
        render: () => (
            <Dialog opened onClose={noop} title="Input URL" footer={<Button>Submit</Button>}>
                <TextField label="URL" placeholder="https://..." required value="" onChange={noop} />
            </Dialog>
        ),
        interact: waitForDialog,
        target: "page",
    },
    "open-without-footer": {
        render: () => (
            <Dialog opened onClose={noop} title="Notice">
                Nothing to configure.
            </Dialog>
        ),
        interact: waitForDialog,
        target: "page",
    },
})
