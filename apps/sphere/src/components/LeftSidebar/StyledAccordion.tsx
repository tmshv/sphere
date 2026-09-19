import { Accordion } from "@mantine/core"
import type { AccordionProps } from "@mantine/core"

export type StyledAccordionProps = Omit<
    AccordionProps,
    "value" | "onChange" | "multiple" | "style" | "defaultValue"
> & {
    value: string[]
    onChange: (value: string[]) => void
}

// The accordion takes the height its parent gives it and never grows past it;
// every item shrinks instead and hands the height it has down to its panel
// body, which is a PanelBody: a fixed header plus a part that scrolls.
const ROOT_STYLE: React.CSSProperties = {
    flex: "1 1 0",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
}

export const StyledAccordion: React.FC<StyledAccordionProps> = ({ value, onChange, ...props }) => (
    <Accordion
        {...props}
        multiple={true}
        value={value}
        onChange={onChange}
        // pt={"sm"}
        variant="default"
        style={ROOT_STYLE}
        styles={theme => ({
            item: {
                flex: "0 1 auto",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",

                "&:first-of-type": {
                    borderTop: `1px solid ${theme.colorScheme === "dark" ? theme.colors.gray[8] : theme.colors.gray[3]}`,
                },
            },
            control: {
                flexShrink: 0,
                height: 30,
                paddingTop: theme.spacing.xs,
                paddingBottom: theme.spacing.xs,
                paddingLeft: theme.spacing.sm,
                paddingRight: theme.spacing.sm,
                backgroundColor: theme.colorScheme === "dark" ? theme.colors.gray[9] : theme.white,
            },
            itemTitle: {
                flexShrink: 0,
            },
            panel: {
                // paddingTop: theme.spacing.sm,
                // paddingBottom: theme.spacing.sm,
                padding: 0,
                flex: "1 1 auto",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",

                // Collapse wraps the panel body in an unclassed div to fade it
                // in; the height constraint has to pass through it to reach
                // the scrolling body below.
                "& > div": {
                    flex: "1 1 auto",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                },
            },
            content: {
                // paddingLeft: theme.spacing.xs,
                paddingLeft: theme.spacing.sm,
                paddingRight: theme.spacing.sm,
                paddingTop: theme.spacing.sm,
                paddingBottom: theme.spacing.sm,
                flex: "1 1 auto",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            },
        })}
    />
)
