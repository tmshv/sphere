/**
 * Returns an array of an object's own property keys that are
 * not prefixed with `_`, indicating pseudo-privacy. Non-enumerable
 * keys count too, so the methods of a class prototype are listed;
 * `constructor` is not.
 *
 * @param {Object} instance
 * @return {Array<string>} Public members
 */
export default function getPublicMemberKeys(instance) {
    return Object.getOwnPropertyNames(instance).filter(k => k[0] !== "_" && k !== "constructor")
}
