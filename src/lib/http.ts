import { getClient } from "@tauri-apps/api/http"

type OkResponse<T> = {
    ok: true
    data: T
}

type ErrorResponse = {
    error: string
    ok: false
}

export async function get<T = any>(url: string): Promise<ErrorResponse | OkResponse<T>> {
    try {
        const client = await getClient()
        const response = await client.get<T>(url)

        if (response.ok) {
            return {
                ok: true,
                data: response.data,
            }
        } else if (response.status === 404) {
            return {
                ok: false,
                error: "Not found",
            }
        } else {
            return {
                ok: false,
                error: "Unknown",
            }
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
            error: "Unknown",
        }
    }
}
