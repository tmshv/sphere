import {
    IconCalendarStats,
    IconDeviceDesktopAnalytics,
    IconFingerprint,
    IconGauge,
    IconHome2,
    IconUser,
    type TablerIcon,
} from "@tabler/icons-react"
import { useState } from "react"
import { Tooltip, unstyledButton } from "../internal"
import s from "./toolbar.module.css"

const ICON_STROKE = 1.5
const INITIAL_ACTIVE_INDEX = 2

export type NavbarLinkProps = {
    icon: TablerIcon
    label: string
    active?: boolean
    onClick?(): void
}

export function NavbarLink({ icon: Icon, label, active, onClick }: NavbarLinkProps) {
    const classes = [unstyledButton, s.link, active && s.active]

    return (
        <Tooltip label={label} side="right" duration={0}>
            <button type="button" onClick={onClick} className={classes.filter(Boolean).join(" ")}>
                <Icon stroke={ICON_STROKE} />
            </button>
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

export function Toolbar({ horizontal = false }: ToolbarProps) {
    const [active, setActive] = useState(INITIAL_ACTIVE_INDEX)

    const links = mockdata.map((link, index) => (
        <NavbarLink {...link} key={link.label} active={index === active} onClick={() => setActive(index)} />
    ))

    return (
        <nav className={s.nav}>
            <div className={[s.stack, horizontal && s.horizontal].filter(Boolean).join(" ")}>{links}</div>
        </nav>
    )
}
