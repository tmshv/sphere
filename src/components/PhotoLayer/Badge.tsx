import { createStyles } from "@mantine/core"

const useStyle = createStyles(theme => ({
    badge: {
        backgroundColor: theme.white,
        padding: "0 5px",
        borderRadius: 50,
        color: theme.black,
        fontSize: 12,
        minWidth: 20,
        textAlign: "center",
        transform: "translate(50 %, -50 %)",
        boxShadow: "0px 0px 3px rgba(0, 0, 20, 0.1)",
    },
}))

export type BadgeProps = {
    top?: number
    right?: number
    children?: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({ top, right, children }) => {
    const { classes: s } = useStyle()
    return (
        <div
            className={s.badge}
            style={{
                position: "absolute",
                top: top ?? 0,
                right: right ?? 0,
            }}
        >
            {children}
        </div>
    )
}

