export function currentTimeSeconds() {
    return Date.now() / 1000
}

export function hasLocalStorage(): boolean {
    return typeof localStorage !== 'undefined'
}

export function getLocalStorageNumber(key: string): number | null {
    if (!hasLocalStorage()) {
        return null;
    }

    const value = localStorage.getItem(key)
    if (!value) {
        return null
    }
    const num = parseInt(value, 10)
    if (Number.isNaN(num)) {
        return null
    }
    return num
}
