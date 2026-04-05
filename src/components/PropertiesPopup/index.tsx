import { selectShowFeatureProperties } from "@/store/app"
import { useAppSelector } from "@/store/hooks"
import { selectProperties } from "@/store/properties"
import { Overlay } from "@/ui/Overlay"
import { PropertiesViewer } from "@/ui/PropertiesViewer"
import { Container, Paper, Title } from "@mantine/core"

const CONTAINER_STYLE: React.CSSProperties = {
    minWidth: 300,
    height: "100%",
}

const PAPER_STYLE: React.CSSProperties = {
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
}

const BODY_STYLE: React.CSSProperties = {
    overflowY: "auto",
}

export default function PropertiesPopup() {
    const enabled = useAppSelector(selectShowFeatureProperties)
    const props = useAppSelector(selectProperties)
    if (!enabled || !props) {
        return null
    }

    return (
        <Overlay
            topRight={
                <Container pt={"lg"} style={CONTAINER_STYLE}>
                    <Paper p={"sm"} style={PAPER_STYLE}>
                        <Title order={3}>Properties</Title>
                        <div style={BODY_STYLE}>
                            {props.map(x => (
                                <PropertiesViewer key={x.id} properties={x.items} />
                            ))}
                        </div>
                    </Paper>
                </Container>
            }
        />
    )
}
