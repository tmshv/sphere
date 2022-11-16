export type StatusbarProps = {
    children: React.ReactNode
}

export const Statusbar: React.FC<StatusbarProps> = ({children}) => {
    return (
        <div style={{
            height: 24,
            backgroundColor: "#2d4144",
            color: "white",
            padding: "0 4px",
            fontFamily: "monospace",
        }}>
            {children}
        </div>
    )
}
