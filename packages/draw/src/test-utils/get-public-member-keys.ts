/**
 * Returns an array of an object's own property keys that are
 * not prefixed with `_`, indicating pseudo-privacy. Non-enumerable
 * keys count too, so the methods of a class prototype are listed;
 * `constructor` is not.
 */
export default function getPublicMemberKeys(instance: object): string[] {
    return Object.getOwnPropertyNames(instance).filter(k => !k.startsWith("_") && k !== "constructor")
}
