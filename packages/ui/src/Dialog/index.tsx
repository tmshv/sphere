import { Modal } from "@mantine/core"
import type { ReactNode } from "react"
import { GAP_PX, Row } from "../Layout"

const FOOTER_STYLE = { marginTop: GAP_PX.md }

export type DialogProps = {
    opened: boolean
    onClose: () => void
    title: string
    footer?: ReactNode
    children: ReactNode
}

export function Dialog({ opened, onClose, title, footer, children }: DialogProps) {
    return (
        <Modal centered size="md" opened={opened} onClose={onClose} title={title}>
            {children}
            {footer ? (
                <Row gap="xs" justify="end" style={FOOTER_STYLE}>
                    {footer}
                </Row>
            ) : null}
        </Modal>
    )
}
