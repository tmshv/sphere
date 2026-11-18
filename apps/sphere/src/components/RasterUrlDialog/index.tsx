import { parseRasterTemplate } from "@/lib/raster-template"
import { actions } from "@/store"
import { selectRasterUrlDialogOpen } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectProjectionCrs } from "@/store/projection"
import { Button, Dialog, Stack, TextField } from "@sphere/ui"
import { type FormEvent, useCallback, useMemo, useState } from "react"

const TEMPLATE_PLACEHOLDER = "https://…/{z}/{x}/{y}.png or WMS GetMap with BBOX={bbox-epsg-3857}"

export function RasterUrlDialog() {
    const dispatch = useAppDispatch()
    const opened = useAppSelector(selectRasterUrlDialogOpen)
    const crs = useAppSelector(selectProjectionCrs)
    const [template, setTemplate] = useState("")
    const [name, setName] = useState("")

    const result = useMemo(() => parseRasterTemplate(template, crs), [template, crs])
    const valid = !("error" in result)
    // An untouched field is not an error yet
    const error = "error" in result && template.trim() ? result.error : undefined
    const defaultName = "name" in result ? result.name : ""

    const close = useCallback(() => {
        setTemplate("")
        setName("")
        dispatch(actions.app.closeRasterUrlDialog())
    }, [dispatch])

    const submit = useCallback(() => {
        if (!valid) {
            return
        }
        dispatch(actions.source.addRasterFromUrl({ template, name }))
        close()
    }, [dispatch, valid, template, name, close])

    const onSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            submit()
        },
        [submit],
    )

    return (
        <Dialog
            opened={opened}
            onClose={close}
            title="Add Raster from URL"
            footer={
                <Button disabled={!valid} onClick={submit}>
                    Add
                </Button>
            }
        >
            <form onSubmit={onSubmit}>
                <Stack gap={"md"} align={"stretch"}>
                    <TextField
                        label="URL template"
                        placeholder={TEMPLATE_PLACEHOLDER}
                        required
                        code
                        value={template}
                        onChange={setTemplate}
                        error={error}
                    />
                    <TextField label="Name" placeholder={defaultName} value={name} onChange={setName} />
                </Stack>
                {/* A form with two fields submits on Enter only when it has a submit button */}
                <button type="submit" hidden />
            </form>
        </Dialog>
    )
}
