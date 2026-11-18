/**
 * Returns a new unique feature id.
 */
export default function generateId(): string {
    return crypto.randomUUID()
}
