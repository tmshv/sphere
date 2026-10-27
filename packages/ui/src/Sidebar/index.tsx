import s from "./sidebar.module.css"

export type SidebarProps = {
    children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
    return <div className={s.container}>{children}</div>
}
