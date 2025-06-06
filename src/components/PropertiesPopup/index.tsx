import { Container, Paper, Title } from "@mantine/core"
import { useAppSelector } from "@/store/hooks"
import { selectProperties } from "@/store/properties"
import { PropertiesViewer } from "@/ui/PropertiesViewer"
import { Overlay } from "@/ui/Overlay"

export default function PropertiesPopup() {
    const props = useAppSelector(selectProperties)
    if (!props) {
        return null
    }

    return (
        <Overlay topRight={(
            <Container pt={"lg"} style={{
                minWidth: 300,
                overflow: "hidden",
            }}>
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
