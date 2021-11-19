import { AuthenticationInfo, fetchAuthenticationInfo, logout } from "./api"
import { currentTimeSeconds, getLocalStorageNumber, hasLocalStorage, hasWindow } from "./helpers"

const LOGGED_IN_AT_KEY = "__PROPEL_AUTH_LOGGED_IN_AT"
const LOGGED_OUT_AT_KEY = "__PROPEL_AUTH_LOGGED_OUT_AT"
const STALE_AUTH_INFO_THRESHOLD_SECS = 4 * 60

export interface IAuthClient {
    /**
     * If the user is logged in, this method returns an access token, the time (in seconds) that the token will expire,
     * the user's organizations (including org names and user's role within the org), and the user's metadata.
     * Otherwise, this method returns null.
     *
     * The promise will generally resolve immediately, unless our current information is stale in which case it will
     * make an API request.
     *
     * @param forceRefresh If true, this method will always make an API request. Default false
     */
    getAuthenticationInfoOrNull(forceRefresh?: boolean): Promise<AuthenticationInfo | null>

    /**
     * Logs the current user out.
     * @param redirectAfterLogout If true, will redirect the user to the configured logout URL.
     */
    logout(redirectAfterLogout: boolean): Promise<void>

    /**
     * Redirects the user to the signup page.
     */
    redirectToSignupPage(): void

    /**
     * Redirects the user to the login page.
     */
    redirectToLoginPage(): void

    /**
     * Redirects the user to the account page.
     */
    redirectToAccountPage(): void

    /**
     * Redirects the user to the organization page.
     * @param orgId The ID of the organization"s page to load. If not specified, a random one will be used instead.
     */
    redirectToOrgPage(orgId?: string): void

    /**
     * Redirects the user to the create organization page.
     */
    redirectToCreateOrgPage(): void

    /**
     * Adds an observer which is called whenever the users logs in or logs out.
     */
    addLoggedInChangeObserver(observer: (isLoggedIn: boolean) => void): void

    /**
     * Removes the observer
     */
    removeLoggedInChangeObserver(observer: (isLoggedIn: boolean) => void): void

    /**
     * Cleanup the auth client if you no longer need it.
     */
    destroy(): void
}

export interface IAuthOptions {
    /**
     * Base URL where your authentication pages are hosted. See **Frontend Integration** section of your PropelAuth project.
     */
    authUrl: string

    /**
     * If true, periodically refresh the token in the background.
     * This helps ensure you always have a valid token ready to go when you need it.
     *
     * Default true
     */
    enableBackgroundTokenRefresh?: boolean
}

interface ClientState {
    initialLoadFinished: boolean
    authenticationInfo: AuthenticationInfo | null
    observers: ((isLoggedIn: boolean) => void)[]
    lastLoggedInAtMessage: number | null
    lastLoggedOutAtMessage: number | null
    refreshInterval: number | null
    readonly authUrl: string
}

function validateAndCleanupOptions(authOptions: IAuthOptions) {
    try {
        // This helps make sure we have a consistent URL ignoring things like trailing slashes
        const authUrl = new URL(authOptions.authUrl)
        authOptions.authUrl = authUrl.origin
    } catch (e) {
        console.error("Invalid authUrl", e)
        throw new Error("Unable to initialize auth client")
    }

    if (authOptions.enableBackgroundTokenRefresh === undefined) {
        authOptions.enableBackgroundTokenRefresh = true
    }
}

export function createClient(authOptions: IAuthOptions): IAuthClient {
    validateAndCleanupOptions(authOptions)

    // Internal state
    const clientState: ClientState = {
        initialLoadFinished: false,
        authenticationInfo: null,
        observers: [],
        lastLoggedInAtMessage: getLocalStorageNumber(LOGGED_IN_AT_KEY),
        lastLoggedOutAtMessage: getLocalStorageNumber(LOGGED_OUT_AT_KEY),
        authUrl: authOptions.authUrl,
        refreshInterval: null,
    }

    // Helper functions
    function notifyObservers(isLoggedIn: boolean) {
        for (let i = 0; i < clientState.observers.length; i++) {
            const observer = clientState.observers[i]
            if (observer) {
                observer(isLoggedIn)
            }
        }
    }

    function userJustLoggedOut(accessToken: string | undefined, previousAccessToken: string | undefined) {
        // Edge case: the first time we go to the page, if we can't load the
        //   auth token we should treat it as a logout event
        return !accessToken && (previousAccessToken || !clientState.initialLoadFinished)
    }

    function userJustLoggedIn(accessToken: string | undefined, previousAccessToken: string | undefined) {
        return !previousAccessToken && accessToken
    }

    function updateLastLoggedOutAt() {
        const loggedOutAt = currentTimeSeconds()
        clientState.lastLoggedOutAtMessage = loggedOutAt
        localStorage.setItem(LOGGED_OUT_AT_KEY, String(loggedOutAt))
    }

    function updateLastLoggedInAt() {
        const loggedInAt = currentTimeSeconds()
        clientState.lastLoggedInAtMessage = loggedInAt
        localStorage.setItem(LOGGED_IN_AT_KEY, String(loggedInAt))
    }

    function setAuthenticationInfoAndUpdateDownstream(authenticationInfo: AuthenticationInfo | null) {
        const previousAccessToken = clientState.authenticationInfo?.accessToken
        clientState.authenticationInfo = authenticationInfo
        const accessToken = authenticationInfo?.accessToken

        if (userJustLoggedOut(accessToken, previousAccessToken)) {
            notifyObservers(false)
            updateLastLoggedOutAt()
        } else if (userJustLoggedIn(accessToken, previousAccessToken)) {
            notifyObservers(true)
            updateLastLoggedInAt()
        }

        clientState.initialLoadFinished = true
    }

    async function forceRefreshToken(returnCached: boolean): Promise<AuthenticationInfo | null> {
        try {
            // Happy case, we fetch auth info and save it
            const authenticationInfo = await fetchAuthenticationInfo(clientState.authUrl)
            setAuthenticationInfoAndUpdateDownstream(authenticationInfo)
            return authenticationInfo
        } catch (e) {
            // If there was an error, we sometimes still want to return the value we have cached
            //   (e.g. if we were prefetching), so in those cases we swallow the exception
            if (returnCached) {
                return clientState.authenticationInfo
            } else {
                setAuthenticationInfoAndUpdateDownstream(null)
                throw e
            }
        }
    }

    const client = {
        addLoggedInChangeObserver(loggedInChangeObserver: (isLoggedIn: boolean) => void): void {
            const hasObserver = clientState.observers.includes(loggedInChangeObserver)
            if (hasObserver) {
                console.error("Observer has been attached already.")
            } else if (!loggedInChangeObserver) {
                console.error("Cannot add a null observer")
            } else {
                clientState.observers.push(loggedInChangeObserver)
            }
        },

        removeLoggedInChangeObserver(loggedInChangeObserver: (isLoggedIn: boolean) => void): void {
            const observerIndex = clientState.observers.indexOf(loggedInChangeObserver)
            if (observerIndex === -1) {
                console.error("Cannot find observer to remove")
            } else {
                clientState.observers.splice(observerIndex, 1)
            }
        },

        async getAuthenticationInfoOrNull(forceRefresh?: boolean): Promise<AuthenticationInfo | null> {
            const currentTimeSecs = currentTimeSeconds()
            if (forceRefresh) {
                return await forceRefreshToken(false)
            } else if (!clientState.authenticationInfo) {
                return await forceRefreshToken(false)
            } else if (
                currentTimeSecs + STALE_AUTH_INFO_THRESHOLD_SECS >
                clientState.authenticationInfo.expiresAtSeconds
            ) {
                // Small edge case: If we were being proactive
                //   and the auth information hasn't expired yet, swallow any exceptions
                const returnCached = currentTimeSecs < clientState.authenticationInfo.expiresAtSeconds
                return await forceRefreshToken(returnCached)
            } else {
                return clientState.authenticationInfo
            }
        },

        redirectToSignupPage(): void {
            window.location.href = `${clientState.authUrl}/signup`
        },

        redirectToLoginPage(): void {
            window.location.href = `${clientState.authUrl}/login`
        },

        redirectToAccountPage(): void {
            window.location.href = `${clientState.authUrl}/account`
        },

        redirectToOrgPage(orgId?: string): void {
            if (orgId) {
                window.location.href = `${clientState.authUrl}/org?id=${orgId}`
            } else {
                window.location.href = `${clientState.authUrl}/org`
            }
        },

        redirectToCreateOrgPage(): void {
            window.location.href = `${clientState.authUrl}/create_org`
        },

        async logout(redirectAfterLogout: boolean): Promise<void> {
            const logoutResponse = await logout(clientState.authUrl)
            setAuthenticationInfoAndUpdateDownstream(null)
            if (redirectAfterLogout) {
                window.location.href = logoutResponse.redirect_to
            }
        },

        destroy() {
            clientState.observers = []
            window.removeEventListener("storage", onStorageChange)
            if (clientState.refreshInterval) {
                clearInterval(clientState.refreshInterval)
            }
        },
    }

    const onStorageChange = async function () {
        // If localStorage isn't available, nothing to do here.
        // This usually happens in frameworks that have some SSR components
        if (!hasLocalStorage()) {
            return
        }

        const loggedOutAt = getLocalStorageNumber(LOGGED_OUT_AT_KEY)
        const loggedInAt = getLocalStorageNumber(LOGGED_IN_AT_KEY)

        // If we've detected a logout event after the last one our client is aware of, trigger a refresh
        if (loggedOutAt && (!clientState.lastLoggedOutAtMessage || loggedOutAt > clientState.lastLoggedOutAtMessage)) {
            clientState.lastLoggedOutAtMessage = loggedOutAt
            if (clientState.authenticationInfo) {
                await forceRefreshToken(true)
            }
        }

        // If we've detected a login event after the last one our client is aware of, trigger a refresh
        if (loggedInAt && (!clientState.lastLoggedInAtMessage || loggedInAt > clientState.lastLoggedInAtMessage)) {
            clientState.lastLoggedInAtMessage = loggedInAt
            if (!clientState.authenticationInfo) {
                await forceRefreshToken(true)
            }
        }
    }

    if (hasWindow()) {
        window.addEventListener("storage", onStorageChange)

        if (authOptions.enableBackgroundTokenRefresh) {
            client.getAuthenticationInfoOrNull()
            clientState.refreshInterval = window.setInterval(client.getAuthenticationInfoOrNull, 60000)
        }
    }

    return client
}
