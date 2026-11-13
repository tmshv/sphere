/**
 * Returns a new unique feature id.
 */
export default function generateId() {
    return crypto.randomUUID()
}
