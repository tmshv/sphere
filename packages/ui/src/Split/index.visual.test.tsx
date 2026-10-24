import { visualCases } from "../visual/visualCases"
import { SplitPane, SplitView } from "."

const PANE_STYLE = { padding: 4, fontSize: 12 }

visualCases("Split", {
    horizontal: {
        render: () => (
            <SplitView defaultSizes={[120, 200]}>
                <SplitPane>
                    <div style={PANE_STYLE}>Left</div>
                </SplitPane>
                <SplitPane>
                    <div style={PANE_STYLE}>Right</div>
                </SplitPane>
            </SplitView>
        ),
    },
    vertical: {
        render: () => (
            <SplitView vertical defaultSizes={[100, 180]}>
                <SplitPane>
                    <div style={PANE_STYLE}>Top</div>
                </SplitPane>
                <SplitPane>
                    <div style={PANE_STYLE}>Bottom</div>
                </SplitPane>
            </SplitView>
        ),
    },
})
