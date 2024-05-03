const DEFAULT_RETRIES = 3

export const runWithRetriesOnAnyError = async <T>(fn: () => Promise<T>): Promise<T> => {
    return runWithRetriesInner(fn, DEFAULT_RETRIES)
}

const runWithRetriesInner = async <T>(fn: () => Promise<T>, numRetriesLeft: number): Promise<T> => {
    try {
        return await fn()
    } catch (e) {
        if (numRetriesLeft <= 0) {
            throw e
        }
        await delay(numRetriesLeftToDelay(numRetriesLeft))
        return runWithRetriesInner(fn, numRetriesLeft - 1)
    }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const numRetriesLeftToDelay = (numRetriesLeft: number) => {
    // We could be fancy, but we only retry 3 times so...
    if (numRetriesLeft >= 3) {
        return 100
    } else if (numRetriesLeft === 2) {
        return 200
    } else {
        return 300
    }
}