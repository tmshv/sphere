import { visualCases } from "../visual/visualCases"
import { AppLayout } from "."

const PANE_STYLE = { padding: 4, fontSize: 12, height: "100%" }
const FOOTER_STYLE = { height: 28, background: "#1a1b1e", color: "#fff", fontSize: 12, padding: 4 }

visualCases("AppLayout", {
    "both-sidebars": {
        render: () => (
            <AppLayout
                leftSidebar={<div style={PANE_STYLE}>Left</div>}
                rightSidebar={<div style={PANE_STYLE}>Right</div>}
                leftSidebarSize={{ preferred: 80, min: 40, max: 120 }}
                rightSidebarSize={{ preferred: 80, min: 40, max: 120 }}
                footer={<div style={FOOTER_STYLE}>Footer</div>}
            >
                <div style={PANE_STYLE}>Main</div>
            </AppLayout>
        ),
    },
    "left-sidebar-only": {
        render: () => (
            <AppLayout
                leftSidebar={<div style={PANE_STYLE}>Left</div>}
                leftSidebarSize={{ preferred: 100, min: 40, max: 160 }}
                footer={<div style={FOOTER_STYLE}>Footer</div>}
            >
                <div style={PANE_STYLE}>Main</div>
            </AppLayout>
        ),
    },
    "no-sidebars": {
        render: () => (
            <AppLayout footer={<div style={FOOTER_STYLE}>Footer</div>}>
                <div style={PANE_STYLE}>Main</div>
            </AppLayout>
        ),
    },
})
