const tableu10 = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"]

let cur = 0
export function nextColor(): string {
    const index = cur
    cur = (++cur % tableu10.length)
    return tableu10[index]
}

export function reset() {
    cur = 0
}
