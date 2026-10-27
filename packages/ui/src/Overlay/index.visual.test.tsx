import type { ReactNode } from "react"
import { visualCases } from "../visual/visualCases"
import { Overlay } from "."

const CHIP_STYLE = { background: "#4dabf7", color: "#000", fontSize: 11, padding: 2 }

function Chip({ children }: { children: string }) {
    return <div style={CHIP_STYLE}>{children}</div>
}

function Frame({ children }: { children: ReactNode }) {
    return <div style={{ position: "relative", width: "100%", height: "100%", background: "#868e96" }}>{children}</div>
}

visualCases("Overlay", {
    corners: {
        render: () => (
            <Frame>
                <Overlay topLeft={<Chip>topLeft</Chip>} topRight={<Chip>topRight</Chip>} />
            </Frame>
        ),
    },
    sides: {
        render: () => (
            <Frame>
                <Overlay left={<Chip>left</Chip>} right={<Chip>right</Chip>} />
            </Frame>
        ),
    },
    "top-bottom": {
        render: () => (
            <Frame>
                <Overlay top={<Chip>top</Chip>} bottom={<Chip>bottom</Chip>} />
            </Frame>
        ),
    },
})
