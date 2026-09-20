// allotment grows a reopened pane only as far as its minSize. To bring a
// section back to the height it had before it was closed, the difference has
// to be taken from its neighbours — proportionally, and never below their own
// minimums. Whatever the minimums refuse to give up simply is not restored,
// which keeps the total unchanged.
export function restoreSize(sizes: number[], index: number, target: number, minSizes: number[]): number[] {
    const current = sizes.at(index)
    if (current === undefined || index < 0) {
        return sizes
    }

    const donorTotal = sizes.reduce((total, size, i) => (i === index ? total : total + size), 0)
    if (donorTotal <= 0) {
        return sizes
    }

    const delta = target - current

    // Distribute delta proportionally across donors, floored by each donor's minimum.
    // Track whether any donor was clamped so we can use exact delta when none were.
    let anyClamped = false
    const donated = sizes.map((size, i) => {
        if (i === index) {
            return size
        }

        const min = minSizes.at(i) ?? 0
        const ideal = size - (delta * size) / donorTotal
        if (ideal < min) {
            anyClamped = true
            return min
        }
        return ideal
    })

    // When no donor was clamped the reductions sum to exactly delta (by algebra),
    // so use delta directly to avoid floating-point drift.
    const taken = anyClamped
        ? sizes.reduce((total, size, i) => {
              if (i === index) {
                  return total
              }
              return total + (size - (donated.at(i) ?? size))
          }, 0)
        : delta

    return donated.map((size, i) => (i === index ? size + taken : size))
}
