import { AuthenticationInfo, fetchAuthenticationInfo, logout } from "./api"
import { runWithRetriesOnAnyError } from "./fetch_retries"
import { currentTimeSeconds, getLocalStorageNumber, hasLocalStorage, hasWindow } from "./helpers"

const LOGGED_IN_AT_KEY = "__PROPEL_AUTH_LOGGED_IN_AT"
const LOGGED_OUT_AT_KEY = "__PROPEL_AUTH_LOGGED_OUT_AT"
const AUTH_TOKEN_REFRESH_BEFORE_EXPIRATION_SECONDS = 10 * 60
const DEFAULT_MIN_SECONDS_BEFORE_REFRESH = 60 * 2
const ACTIVE_ORG_ACCESS_TOKEN_REFRESH_EXPIRATION_SECONDS = 60 * 5

const encodeBase64 = (str: string) => {
    const encode = window ? window.btoa : btoa
    return encode(str)
}

export interface RedirectToSignupOptions {
    postSignupRedirectUrl?: string
    userSignupQueryParameters?: Record<string, string>
}

export interface RedirectToLoginOptions {
    postLoginRedirectUrl?: string
    userSignupQueryParameters?: Record<string, string>
}

export interface RedirectToAccountOptions {
    redirectBackToUrl?: string
}

export interface RedirectToCreateOrgOptions {
    redirectBackToUrl?: string
}

export interface RedirectToOrgPageOptions {
    redirectBackToUrl?: string
}

export interface RedirectToSetupSAMLPageOptions {
    redirectBackToUrl?: string
}

export type AccessTokenForActiveOrg =
    | {
          error: undefined
          accessToken: string
      }
    | {
          error: "user_not_in_org"
          accessToken: never
      }
    | {
          error: "unexpected_error"
          accessToken: never
      }

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
     * Gets the URL for the hosted signup page.
     */
    getSignupPageUrl(options?: RedirectToSignupOptions): string

    /**
     * Gets the URL for the hosted login page.
     */
    getLoginPageUrl(options?: RedirectToLoginOptions): string

    /**
     * Gets the URL for the hosted account page.
     */
    getAccountPageUrl(options?: RedirectToAccountOptions): string

    /**
     * Gets the URL for the hosted organization page.
     * @param orgId The ID of the organization's page to load. If not specified, a random one will be used instead.
     */
    getOrgPageUrl(orgId?: string, options?: RedirectToOrgPageOptions): string

    /**
     * Gets the URL for the hosted create organization page.
     */
    getCreateOrgPageUrl(options?: RedirectToCreateOrgOptions): string

    /**
     * Gets the URL for the hosted SAML configuration page.
     */
    getSetupSAMLPageUrl(orgId: string): string

    /**
     * Gets an access token for a specific organization, known as an Active Org.
     */
    getAccessTokenForOrg(orgId: string): Promise<AccessTokenForActiveOrg>

    /**
     * Redirects the user to the signup page.
     */
    redirectToSignupPage(options?: RedirectToSignupOptions): void

    /**
     * Redirects the user to the login page.
     */
    redirectToLoginPage(options?: RedirectToLoginOptions): void

    /**
     * Redirects the user to the account page.
     */
    redirectToAccountPage(options?: RedirectToAccountOptions): void

    /**
     * Redirects the user to the organization page.
     * @param orgId The ID of the organization"s page to load. If not specified, a random one will be used instead.
     */
    redirectToOrgPage(orgId?: string, options?: RedirectToOrgPageOptions): void

    /**
     * Redirects the user to the create organization page.
     */
    redirectToCreateOrgPage(options?: RedirectToCreateOrgOptions): void

    /**
     * Redirects the user to the SAML configuration page.
     */
    redirectToSetupSAMLPage(orgId: string, options?: RedirectToSetupSAMLPageOptions): void

    /**
     * Adds an observer which is called whenever the users logs in or logs out.
     */
    addLoggedInChangeObserver(observer: (isLoggedIn: boolean) => void): void

    /**
     * Removes the observer
     */
    removeLoggedInChangeObserver(observer: (isLoggedIn: boolean) => void): void

    /**
     * Adds an observer which is called whenever the access token changes.
     */
    addAccessTokenChangeObserver(observer: (accessToken: string | undefined) => void): void

    /**
     * Removes the observer
     */
    removeAccessTokenChangeObserver(observer: (accessToken: string | undefined) => void): void

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

    /**
     * Minimum number of seconds before refreshing the token again.
     * Defaults to 120 seconds.
     */
    minSecondsBeforeRefresh?: number

    /**
     * If true, disables the token refresh when the tab regains focus.
     *
     * Default false
     */
    disableRefreshOnFocus?: boolean
}

interface AccessTokenActiveOrgMap {
    [orgId: string]: {
        accessToken: string
        fetchedAt: number
    }
}

interface ClientState {
    initialLoadFinished: boolean
    authenticationInfo: AuthenticationInfo | null
    observers: ((isLoggedIn: boolean) => void)[]
    accessTokenObservers: ((accessToken: string | undefined) => void)[]
    lastLoggedInAtMessage: number | null
    lastLoggedOutAtMessage: number | null
    refreshInterval: number | null
    lastRefresh: number | null
    accessTokenActiveOrgMap: AccessTokenActiveOrgMap
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
    const { minSecondsBeforeRefresh = DEFAULT_MIN_SECONDS_BEFORE_REFRESH } = authOptions

    validateAndCleanupOptions(authOptions)

    // Internal state
    const clientState: ClientState = {
        initialLoadFinished: false,
        authenticationInfo: null,
        observers: [],
        accessTokenObservers: [],
        lastLoggedInAtMessage: getLocalStorageNumber(LOGGED_IN_AT_KEY),
        lastLoggedOutAtMessage: getLocalStorageNumber(LOGGED_OUT_AT_KEY),
        authUrl: authOptions.authUrl,
        refreshInterval: null,
        lastRefresh: null,
        accessTokenActiveOrgMap: {},
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

    function notifyObserversOfAccessTokenChange(accessToken: string | undefined) {
        for (let i = 0; i < clientState.accessTokenObservers.length; i++) {
            const observer = clientState.accessTokenObservers[i]
            if (observer) {
                observer(accessToken)
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
        if (hasLocalStorage()) {
            localStorage.setItem(LOGGED_OUT_AT_KEY, String(loggedOutAt))
        }
    }

    function updateLastLoggedInAt() {
        const loggedInAt = currentTimeSeconds()
        clientState.lastLoggedInAtMessage = loggedInAt
        if (hasLocalStorage()) {
            localStorage.setItem(LOGGED_IN_AT_KEY, String(loggedInAt))
        }
    }

    /**
     * Invalidates all org's access tokens.
     */
    function resetAccessTokenActiveOrgMap() {
        clientState.accessTokenActiveOrgMap = {}
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

        if (previousAccessToken !== accessToken) {
            notifyObserversOfAccessTokenChange(accessToken)
        }

        resetAccessTokenActiveOrgMap()

        clientState.lastRefresh = currentTimeSeconds()
        clientState.initialLoadFinished = true
    }

    async function forceRefreshToken(returnCached: boolean): Promise<AuthenticationInfo | null> {
        try {
            // Happy case, we fetch auth info and save it
            const authenticationInfo = await runWithRetriesOnAnyError(() =>
                fetchAuthenticationInfo(clientState.authUrl)
            )
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

    const getSignupPageUrl = (options?: RedirectToSignupOptions) => {
        let qs = new URLSearchParams()
        let url = `${clientState.authUrl}/signup`
        if (options) {
            const { postSignupRedirectUrl, userSignupQueryParameters } = options
            if (postSignupRedirectUrl) {
                qs.set("rt", encodeBase64(postSignupRedirectUrl))
            }
            if (userSignupQueryParameters) {
                Object.entries(userSignupQueryParameters).forEach(([key, value]) => {
                    qs.set(key, value)
                })
            }
        }
        if (qs.toString()) {
            url += `?${qs.toString()}`
        }
        return url
    }

    const getLoginPageUrl = (options?: RedirectToLoginOptions) => {
        let qs = new URLSearchParams()
        let url = `${clientState.authUrl}/login`
        if (options) {
            const { postLoginRedirectUrl, userSignupQueryParameters } = options
            if (postLoginRedirectUrl) {
                qs.set("rt", encodeBase64(postLoginRedirectUrl))
            }
            if (userSignupQueryParameters) {
                Object.entries(userSignupQueryParameters).forEach(([key, value]) => {
                    qs.set(key, value)
                })
            }
        }
        if (qs.toString()) {
            url += `?${qs.toString()}`
        }
        return url
    }

    const getAccountPageUrl = (options?: RedirectToAccountOptions) => {
        let qs = new URLSearchParams()
        let url = `${clientState.authUrl}/account`
        if (options) {
            const { redirectBackToUrl } = options
            if (redirectBackToUrl) {
                qs.set("rt", encodeBase64(redirectBackToUrl))
            }
        }

        if (qs.toString()) {
            url += `?${qs.toString()}`
        }
        return url
    }

    const getOrgPageUrl = (orgId?: string, options?: RedirectToOrgPageOptions) => {
        let qs = new URLSearchParams()
        let url = `${clientState.authUrl}/org`
        if (orgId) {
            qs.set("id", orgId)
        }

        if (options) {
            if (options.redirectBackToUrl) {
                qs.set("rt", encodeBase64(options.redirectBackToUrl))
            }
        }

        if (qs.toString()) {
            url += `?${qs.toString()}`
        }
        return url
    }

    const getCreateOrgPageUrl = (options?: RedirectToCreateOrgOptions) => {
        let qs = new URLSearchParams()
        let url = `${clientState.authUrl}/create_org`
        if (options) {
            const { redirectBackToUrl } = options
            if (redirectBackToUrl) {
                qs.set("rt", encodeBase64(redirectBackToUrl))
            }
        }
        if (qs.toString()) {
            url += `?${qs.toString()}`
        }
        return url
    }

    const getSetupSAMLPageUrl = (orgId: string, options?: RedirectToSetupSAMLPageOptions) => {
        let qs = new URLSearchParams()
        if (options) {
            if (options.redirectBackToUrl) {
                qs.set("rt", encodeBase64(options.redirectBackToUrl))
            }
        }
        qs.set("id", orgId)

        return `${clientState.authUrl}/saml?${qs.toString()}`
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

        addAccessTokenChangeObserver(observer: (accessToken: string | undefined) => void) {
            const hasObserver = clientState.accessTokenObservers.includes(observer)
            if (hasObserver) {
                console.error("Observer has been attached already.")
            } else if (!observer) {
                console.error("Cannot add a null observer")
            } else {
                clientState.accessTokenObservers.push(observer)
            }
        },

        removeAccessTokenChangeObserver(observer: (accessToken: string | undefined) => void) {
            const observerIndex = clientState.accessTokenObservers.indexOf(observer)
            if (observerIndex === -1) {
                console.error("Cannot find observer to remove")
            } else {
                clientState.accessTokenObservers.splice(observerIndex, 1)
            }
        },

        async getAuthenticationInfoOrNull(forceRefresh?: boolean): Promise<AuthenticationInfo | null> {
            const currentTimeSecs = currentTimeSeconds()
            if (forceRefresh) {
                return await forceRefreshToken(false)
            } else if (!clientState.authenticationInfo) {
                return await forceRefreshToken(false)
            } else if (
                currentTimeSecs + AUTH_TOKEN_REFRESH_BEFORE_EXPIRATION_SECONDS >
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

        async getAccessTokenForOrg(orgId: string): Promise<AccessTokenForActiveOrg> {
            // First, check if there is a valid access token for the org ID in the
            // valid time frame.
            const currentTimeSecs = currentTimeSeconds()

            const activeOrgAccessToken = clientState.accessTokenActiveOrgMap[orgId]
            if (!!activeOrgAccessToken) {
                if (
                    currentTimeSecs <
                    activeOrgAccessToken.fetchedAt + ACTIVE_ORG_ACCESS_TOKEN_REFRESH_EXPIRATION_SECONDS
                ) {
                    return {
                        accessToken: activeOrgAccessToken.accessToken,
                        error: undefined,
                    }
                }
            }
            // Fetch the access token for the org ID and update.
            try {
                const authenticationInfo = await runWithRetriesOnAnyError(() =>
                    fetchAuthenticationInfo(clientState.authUrl, orgId)
                )
                if (!authenticationInfo) {
                    // Only null if 401 unauthorized.
                    return {
                        error: "user_not_in_org",
                        accessToken: null as never,
                    }
                }
                const { accessToken } = authenticationInfo
                clientState.accessTokenActiveOrgMap[orgId] = {
                    accessToken,
                    fetchedAt: currentTimeSecs,
                }
                return {
                    accessToken,
                    error: undefined,
                }
            } catch (e) {
                return {
                    error: "unexpected_error",
                    accessToken: null as never,
                }
            }
        },

        getSignupPageUrl(options?: RedirectToSignupOptions): string {
            return getSignupPageUrl(options)
        },

        getLoginPageUrl(options?: RedirectToLoginOptions): string {
            return getLoginPageUrl(options)
        },

        getAccountPageUrl(options?: RedirectToAccountOptions): string {
            return getAccountPageUrl(options)
        },

        getOrgPageUrl(orgId?: string, options?: RedirectToOrgPageOptions): string {
            return getOrgPageUrl(orgId, options)
        },

        getCreateOrgPageUrl(options?: RedirectToCreateOrgOptions): string {
            return getCreateOrgPageUrl(options)
        },

        getSetupSAMLPageUrl(orgId: string, options?: RedirectToSetupSAMLPageOptions): string {
            return getSetupSAMLPageUrl(orgId, options)
        },

        redirectToSignupPage(options?: RedirectToSignupOptions): void {
            window.location.href = getSignupPageUrl(options)
        },

        redirectToLoginPage(options?: RedirectToLoginOptions): void {
            window.location.href = getLoginPageUrl(options)
        },

        redirectToAccountPage(options?: RedirectToAccountOptions): void {
            window.location.href = getAccountPageUrl(options)
        },

        redirectToOrgPage(orgId?: string, options?: RedirectToOrgPageOptions): void {
            window.location.href = getOrgPageUrl(orgId, options)
        },

        redirectToCreateOrgPage(options?: RedirectToCreateOrgOptions): void {
            window.location.href = getCreateOrgPageUrl(options)
        },

        redirectToSetupSAMLPage(orgId: string, options?: RedirectToSetupSAMLPageOptions) {
            window.location.href = getSetupSAMLPageUrl(orgId, options)
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
            clientState.accessTokenObservers = []
            window.removeEventListener("storage", onStorageChange)
            window.removeEventListener("online", onOnlineOrFocus)
            if (!authOptions.disableRefreshOnFocus) {
                window.removeEventListener("focus", onOnlineOrFocus)
            }
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

    // If we were offline or on a different tab, when we return, refetch auth info
    // Some browsers trigger focus more often than we'd like, so we'll debounce a little here as well
    const onOnlineOrFocus = async function () {
        if (clientState.lastRefresh && currentTimeSeconds() > clientState.lastRefresh + minSecondsBeforeRefresh) {
            await forceRefreshToken(true)
        } else {
            await client.getAuthenticationInfoOrNull()
        }
    }

    if (hasWindow()) {
        window.addEventListener("storage", onStorageChange)
        window.addEventListener("online", onOnlineOrFocus)

        if (!authOptions.disableRefreshOnFocus) {
            window.addEventListener("focus", onOnlineOrFocus)
        }

        if (authOptions.enableBackgroundTokenRefresh) {
            client.getAuthenticationInfoOrNull()
            clientState.refreshInterval = window.setInterval(client.getAuthenticationInfoOrNull, 60000)
        }
    }

    return client
}
