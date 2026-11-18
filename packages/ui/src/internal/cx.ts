// Joins class names, skipping the falsy ones: cx(a, isOn && b).
export function cx(...classes: Array<string | false | undefined>): string {
    return classes.filter(Boolean).join(" ")
}
