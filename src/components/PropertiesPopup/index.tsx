import { Container, Paper, Title } from "@mantine/core"
import { useAppSelector } from "@/store/hooks"
import { selectProperties } from "@/store/properties"
import { PropertiesViewer } from "@/ui/PropertiesViewer"
import { Overlay } from "@/ui/Overlay"

const CONTAINER_STYLE: React.CSSProperties = {
    minWidth: 300,
    overflow: "hidden",
}

export default function PropertiesPopup() {
    const props = useAppSelector(selectProperties)
    if (!props) {
        return null
    }

    return (
        <Overlay topRight={(
            <Container pt={"lg"} style={CONTAINER_STYLE}>
                <Paper p={"sm"}>
                    <Title order={3}>
                        Properties
                    </Title>
                    {props.map((x, i) => (
                        <PropertiesViewer
                            key={i}
                            properties={x}
                        />
                    ))}
                </Paper>
            </Container>
        )} />
    )
}
