/** A readable message for a caught value. Tauri commands reject with plain strings, not `Error`s. */
export function errorMessage(err: unknown): string {
    if (err instanceof Error) {
        return err.message
    }
    return String(err)
}
