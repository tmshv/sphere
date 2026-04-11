type Unsubscribe = () => void
type Subscribe<T> = (handler: (value: T) => void) => Unsubscribe | Promise<Unsubscribe>

export function once<T>(subscribe: Subscribe<T>, options: { timeout?: number; label?: string } = {}): Promise<T> {
    const { timeout, label = "event" } = options
    return new Promise((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout> | undefined
        const unsubscribePromise = Promise.resolve(
            subscribe(value => {
                if (timer) {
                    clearTimeout(timer)
                }
                unsubscribePromise.then(fn => fn())
                resolve(value)
            }),
        )
        unsubscribePromise.catch(reject)
        if (timeout) {
            timer = setTimeout(() => {
                unsubscribePromise.then(fn => fn())
                reject(new Error(`Timeout waiting for ${label}`))
            }, timeout)
        }
    })
}
