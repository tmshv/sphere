import { init } from "./array"

export function getStem(pathname: string): string | null {
    if (pathname.length === 0) {
        return null
    }

    const parts = pathname.split("/")
    const file = parts[parts.length - 1]
    const fileParts = file.split(".")
    if (fileParts.length === 1) {
        return fileParts[0]
    }
    return init(fileParts).join(".")
}

