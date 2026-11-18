import { type ReactNode, useId } from "react"
import s from "./popover.module.css"

export type PopoverSectionProps = {
    title: string
    children: ReactNode
}

// A titled group of fields inside a Popover. Sections after the first are set off by a separator line.
export function PopoverSection({ title, children }: PopoverSectionProps) {
    const headingId = useId()

    return (
        <section className={s.section} aria-labelledby={headingId}>
            <h3 id={headingId} className={s.sectionTitle}>
                {title}
            </h3>
            {children}
        </section>
    )
}
