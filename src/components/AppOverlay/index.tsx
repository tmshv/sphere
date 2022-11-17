import React from "react";
import { Badge, List, Paper } from "@mantine/core";
import { useAppSelector } from "../../store/hooks";
import { selectIsZen } from "../../store/app";

const Layers: React.FC = () => {
    const sources = useAppSelector(state => state.source.allIds.map(id => {
        const s = state.source.items[id]

        return {
            id,
            name: s.name,
            type: s.type,
        }
    }))
    return (
        <List>
            {sources.map(source => (
                <List.Item key={source.id}>
                    {source.name}

                    <Badge>{source.type}</Badge>
                </List.Item>
            ))}
        </List>
    )
}

export type AppOverlayProps = {

}

export const AppOverlay: React.FC<AppOverlayProps> = ({ }) => {
    const isZen = useAppSelector(selectIsZen)
    if (isZen) {
        return null
    }

    return (
        <div style={{
            position: "absolute",
            top: 10,
            left: 10,
        }}>
            <Paper p={"md"}>
                <Layers />
            </Paper>
        </div>
    );
}
