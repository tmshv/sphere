import { Accordion } from '@mantine/core';
import type { AccordionProps } from '@mantine/core';

export type StyledAccordionProps = Omit<AccordionProps, "value" | "onChange" | "multiple" | "style" | "defaultValue"> & {
    value: string[]
    onChange: (value: string[]) => void
}

export const StyledAccordion: React.FC<StyledAccordionProps> = ({ value, onChange, ...props }) => (
    <Accordion
        {...props}
        multiple={true}
        value={value}
        onChange={onChange}
        // pt={"sm"}
        variant="default"
        styles={theme => ({
            item: {
                "&:first-of-type": {
                    borderTop: `1px solid ${theme.colorScheme === "dark" ? theme.colors.gray[8] : theme.colors.gray[3]}`,
                },
            },
            control: {
                height: 30,
                paddingTop: theme.spacing.xs,
                paddingBottom: theme.spacing.xs,
                paddingLeft: theme.spacing.sm,
                paddingRight: theme.spacing.sm,
                backgroundColor: theme.colorScheme === "dark" ? theme.colors.gray[9] : theme.white,
            },
            panel: {
                // paddingTop: theme.spacing.sm,
                // paddingBottom: theme.spacing.sm,
                padding: 0,
            },
            content: {
                // paddingLeft: theme.spacing.xs,
                paddingLeft: theme.spacing.sm,
                paddingRight: theme.spacing.sm,
                paddingTop: theme.spacing.sm,
                paddingBottom: theme.spacing.sm,
            },
        })}
    />
);
