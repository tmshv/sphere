import { visualCases } from "../visual/visualCases"
import { Sidebar } from "."

visualCases("Sidebar", {
    default: {
        render: () => (
            <Sidebar>
                <div style={{ fontSize: 12 }}>Sidebar content</div>
            </Sidebar>
        ),
    },
})
