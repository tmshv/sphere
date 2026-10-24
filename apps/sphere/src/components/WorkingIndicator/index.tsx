import { useAppSelector } from "@/store/hooks"
import { Spinner } from "@sphere/ui"

export function WorkingIndicator() {
    const working = useAppSelector(state => {
        let sourceWorking = false
        for (const sourceId of state.source.allIds) {
            const source = state.source.items[sourceId]
            if (source.pending) {
                sourceWorking = true
                break
            }
        }
        return sourceWorking
    })

    if (!working) {
        return null
    }

    return <Spinner />
}
