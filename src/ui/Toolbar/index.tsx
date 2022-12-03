import { useState } from "react"
import { Navbar, Tooltip, UnstyledButton, createStyles, Stack } from "@mantine/core"
import {
    TablerIcon,
    IconHome2,
    IconGauge,
    IconDeviceDesktopAnalytics,
    IconFingerprint,
    IconCalendarStats,
    IconUser,
    IconSettings,
} from "@tabler/icons"

const useStyles = createStyles((theme) => {
    const dark = theme.colorScheme === "dark"

    return {
        nav: {
            width: "auto",
            height: "100%",
            // borderRightColor: dark
            //     ? "#0f0f0f"
            //     : "#f0f0f0",
            // border: "none",
            border: dark
                ? "1px solid #0f0f0f"
                : "1px solid #f0f0f0",
            borderRadius: theme.radius.md,
        },
        horizontal: {
            flexDirection: "row",
        },

        link: {
            width: 38,
            height: 38,

            borderRadius: theme.radius.md,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: dark
                ? theme.colors.dark[0]
                : theme.colors.gray[7],

            "&:hover": {
                backgroundColor: dark
                    ? theme.colors.dark[5]
                    : theme.colors.gray[0],
            },
        },

        active: {
            "&, &:hover": {
                backgroundColor: theme.fn.variant({ variant: "light", color: theme.primaryColor }).background,
                color: theme.fn.variant({ variant: "light", color: theme.primaryColor }).color,
            },
        },
    }
})

export type NavbarLinkProps = {
    icon: TablerIcon;
    label: string;
    active?: boolean;
    onClick?(): void;
}

export const NavbarLink: React.FC<NavbarLinkProps> = ({ icon: Icon, label, active, onClick }: NavbarLinkProps) => {
    const { classes: s, cx } = useStyles()

    return (
        <Tooltip label={label} position="right" transitionDuration={0}>
            <UnstyledButton onClick={onClick} className={cx(s.link, { [s.active]: active })}>
                <Icon stroke={1.5} />
            </UnstyledButton>
        </Tooltip>
    )
}

const mockdata = [
    { icon: IconHome2, label: "Home" },
    { icon: IconGauge, label: "Dashboard" },
    { icon: IconDeviceDesktopAnalytics, label: "Analytics" },
    { icon: IconCalendarStats, label: "Releases" },
    { icon: IconUser, label: "Account" },
    { icon: IconFingerprint, label: "Security" },
]

export type ToolbarProps = {
    horizontal?: boolean
}

export const Toolbar: React.FC<ToolbarProps> = ({ horizontal = false }) => {
    const [active, setActive] = useState(2)
    const { classes: s, cx } = useStyles()

    const links = mockdata.map((link, index) => (
        <NavbarLink
            {...link}
            key={link.label}
            active={index === active}
            onClick={() => setActive(index)}
        />
    ))

    return (
        <Navbar
            // pl="sm"
            // pr="sm"
            p="sm"
            className={s.nav}
        >
            <Stack justify="center" spacing={"sm"} className={cx({ [s.horizontal]: horizontal })}
            >
                {links}
            </Stack>
        </Navbar>
    )
}
