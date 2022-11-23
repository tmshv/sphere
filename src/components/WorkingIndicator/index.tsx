import { Loader } from "@mantine/core";
import { useAppSelector } from "@/store/hooks";

export type WorkingIndicatorProps = {

}

export const WorkingIndicator: React.FC<WorkingIndicatorProps> = ({ }) => {
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

    return (
        <Loader size={"xs"} />
    );
}
