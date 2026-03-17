import { fetch } from "@tauri-apps/plugin-http"

type OkResponse<T> = {
    ok: true
    data: T
}

type ErrorResponse = {
    error: string
    ok: false
}

export async function get<T>(url: string): Promise<ErrorResponse | OkResponse<T>> {
    try {
        const response = await fetch(url)

        if (response.ok) {
            const data: T = await response.json()
            return {
                ok: true,
                data,
            }
        }
        if (response.status === 404) {
            return {
                ok: false,
                error: "Not found",
            }
        }
        return {
            ok: false,
            error: "Unknown",
        }
    } catch (error) {
        // "Network Error: Io Error: failed to lookup address information: nodename nor servname provided, or not known: Io Error: failed to looku…"
        const e = error as string
        if (e.startsWith("Network Error")) {
            return {
                ok: false,
                error: "Offline",
            }
        }

        return {
            ok: false,
            error: error as unknown as string,
        }
    }
}
