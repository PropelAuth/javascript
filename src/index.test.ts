/**
 * @jest-environment jsdom
 */
import { createClient } from "./index"
import { ok, ResponseStatus, setupMockXMLHttpRequest, UnauthorizedResponse, UnknownErrorResponse } from "./mockxhr.test"
import { OrgIdToOrgMemberInfo, UserRole } from "./org"

const INITIAL_TIME_MILLIS = 1619743452595
const INITIAL_TIME_SECONDS = INITIAL_TIME_MILLIS / 1000

beforeAll(() => {
    jest.useFakeTimers("modern")
})

beforeEach(() => {
    jest.setSystemTime(INITIAL_TIME_MILLIS)

    let eventToEventListener: any = {}
    window.addEventListener = jest.fn((event, callback) => {
        if (event in eventToEventListener) {
            eventToEventListener[event].push(callback)
        } else {
            eventToEventListener[event] = [callback]
        }
    })

    window.dispatchEvent = jest.fn((event) => {
        let listeners = eventToEventListener[event.type]
        for (let i = 0; i < listeners.length; i++) {
            listeners[i]()
        }
        return true
    })

    const localStorageMock = (function () {
        let store: { [key: string]: string } = {}
        return {
            getItem: function (key: string) {
                return store[key]
            },
            setItem: function (key: string, value: string) {
                store[key] = value.toString()
                window.dispatchEvent(
                    new StorageEvent("storage", {
                        key: key,
                        newValue: value,
                    })
                )
            },
            clear: function () {
                store = {}
            },
            removeItem: function (key: string) {
                delete store[key]
            },
        }
    })()
    Object.defineProperty(window, "localStorage", { value: localStorageMock })
})

afterEach(() => {
    localStorage.clear()
})

afterAll(() => {
    jest.useRealTimers()
})

test("cannot create client without auth url origin", () => {
    expect(() => {
        createClient({ authUrl: "" })
    }).toThrow()
})

test("cannot create client with invalid auth url origin", () => {
    expect(() => {
        createClient({ authUrl: "whatisthis" })
    }).toThrow()
})

test("client works with ending slash", async () => {
    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken()
    let client = createClient({ authUrl: "https://www.example.com/", enableBackgroundTokenRefresh: false })

    const authenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo?.accessToken).toBe(expectedAccessToken)
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token")
})

test("client works without ending slash", async () => {
    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken()
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    const authenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo?.accessToken).toBe(expectedAccessToken)
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token")
})

test("client parses user correctly", async () => {
    const { mockHttp } = setupMockHttpThatReturnsAccessToken()
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    const authenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo?.user.userId).toBe(DEFAULT_USER.user_id)
    expect(authenticationInfo?.user.email).toBe(DEFAULT_USER.email)
    expect(authenticationInfo?.user.username).toBe(DEFAULT_USER.username)
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token")
})

test("client parses org information correctly", async () => {
    const expiresAtSeconds = INITIAL_TIME_SECONDS + 60 * 30
    const apiOrgIdToOrgMemberInfo = {
        "922c5c21-be96-484f-9383-ee532dd79d02": {
            org_id: "922c5c21-be96-484f-9383-ee532dd79d02",
            org_name: "ninetwotwo",
            url_safe_org_name: "ninetwotwo",
            user_role: "Owner",
        },
        "fcdb21f0-b1b6-426f-b83c-6cf4b903d737": {
            org_id: "fcdb21f0-b1b6-426f-b83c-6cf4b903d737",
            org_name: "effcdee",
            url_safe_org_name: "effcdee",
            user_role: "Admin",
        },
        "da5903d3-5696-4e4b-920b-bc429b2f75ab": {
            org_id: "da5903d3-5696-4e4b-920b-bc429b2f75ab",
            org_name: "deeafive",
            url_safe_org_name: "deeafive",
            user_role: "Member",
        },
    }
    const typeScriptOrgIdToOrgMemberInfo: OrgIdToOrgMemberInfo = {
        "922c5c21-be96-484f-9383-ee532dd79d02": {
            orgId: "922c5c21-be96-484f-9383-ee532dd79d02",
            orgName: "ninetwotwo",
            urlSafeOrgName: "ninetwotwo",
            userRole: UserRole.Owner,
        },
        "fcdb21f0-b1b6-426f-b83c-6cf4b903d737": {
            orgId: "fcdb21f0-b1b6-426f-b83c-6cf4b903d737",
            orgName: "effcdee",
            urlSafeOrgName: "effcdee",
            userRole: UserRole.Admin,
        },
        "da5903d3-5696-4e4b-920b-bc429b2f75ab": {
            orgId: "da5903d3-5696-4e4b-920b-bc429b2f75ab",
            orgName: "deeafive",
            urlSafeOrgName: "deeafive",
            userRole: UserRole.Member,
        }
    }

    const { mockHttp } = setupMockHttpThatReturnsAccessToken(expiresAtSeconds, DEFAULT_USER, apiOrgIdToOrgMemberInfo)
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    const authenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo?.orgIdToOrgMemberInfo).toStrictEqual(typeScriptOrgIdToOrgMemberInfo)
    expect(authenticationInfo?.orgHelper.getOrgs()).toStrictEqual(Object.values(typeScriptOrgIdToOrgMemberInfo))
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token")
})

test("client returns null on a 401", async () => {
    const { mockHttp } = setupMockHttpThatReturnsUnauthorized()
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    const authenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo).toBeNull()
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token")
})

test("repeated calls to getAuthenticationInfo do NOT make multiple http requests if the expiration is far in the future", async () => {
    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken()
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    const authenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo?.accessToken).toBe(expectedAccessToken)
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token", 1)

    // Change the server to return a different access token.
    // Since time is mocked and not advancing, we will continue to use the current access token
    const { mockHttp: newMockHttp } = setupMockHttpThatReturnsAccessToken()
    for (let i = 0; i < 10; i++) {
        const latestAuthenticationInfo = await client.getAuthenticationInfoOrNull()
        expect(latestAuthenticationInfo?.accessToken).toBe(expectedAccessToken)
    }
    expectMockWasNeverCalled(newMockHttp)
})

test("if expiration is coming up, calls to getAuthenticationInfo will make a new http request", async () => {
    const expiresAtSeconds = INITIAL_TIME_SECONDS + 60 * 30
    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken(expiresAtSeconds)
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    // Since time is not advancing, at the end of these 10 calls, the endpoint would only be hit once
    for (let i = 0; i < 10; i++) {
        const authenticationInfo = await client.getAuthenticationInfoOrNull()
        expect(authenticationInfo?.accessToken).toBe(expectedAccessToken)
    }
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token", 1)

    // Advance time and reset the servers access token
    jest.setSystemTime(expiresAtSeconds * 1000)
    const newExpiresAtSeconds = expiresAtSeconds + 60 * 30
    const { expectedAccessToken: newExpectedAccessToken, mockHttp: newMockHttp } =
        setupMockHttpThatReturnsAccessToken(newExpiresAtSeconds)

    // Now we should realize the expiration time is up and request a new token, but again, only once
    for (let i = 0; i < 10; i++) {
        const newAuthenticationInfo = await client.getAuthenticationInfoOrNull()
        expect(newAuthenticationInfo?.accessToken).toBe(newExpectedAccessToken)
    }
    expectCorrectEndpointWasHit(newMockHttp, "https://www.example.com/api/v1/refresh_token", 1)
})

test("force refresh will force another http request", async () => {
    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken()
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    // In the real world we'd get a new token each time, but in tests it's hardcoded
    for (let i = 0; i < 10; i++) {
        const authenticationInfo = await client.getAuthenticationInfoOrNull(true)
        expect(authenticationInfo?.accessToken).toBe(expectedAccessToken)
    }

    // None of these will make a web request
    for (let i = 0; i < 10; i++) {
        const authenticationInfo = await client.getAuthenticationInfoOrNull()
        expect(authenticationInfo?.accessToken).toBe(expectedAccessToken)
    }

    // 10 times, the second loop will use the cached value as expiresAt is still far in the future
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token", 10)
})

test("client returns null on a refresh that 401s", async () => {
    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken()
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    // First we get the token like normal
    const authenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo?.accessToken).toBe(expectedAccessToken)
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token")

    // Then we force a refresh after setting up the server to 401
    const { mockHttp: errorMockHttp } = setupMockHttpThatReturnsUnauthorized()
    const errorAuthenticationInfo = await client.getAuthenticationInfoOrNull(true)
    expect(errorAuthenticationInfo).toBeNull()
    expectCorrectEndpointWasHit(errorMockHttp, "https://www.example.com/api/v1/refresh_token")
})

test("client continues to use cached value if the API fails and the value hasn't expired", async () => {
    const expiresAtSeconds = INITIAL_TIME_SECONDS + 60 * 30
    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken()
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    // First we get the token like normal
    const authenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo?.accessToken).toBe(expectedAccessToken)
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token")

    // One minute before expiration. We're close enough that we will proactively try and refresh the token
    jest.setSystemTime((expiresAtSeconds - 60) * 1000)

    // The API will now fail, but that failure should be logged and not effect this method
    const { mockHttp: errorMockHttp } = setupMockHttpThatReturnsUnknownError()
    const newAuthenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(newAuthenticationInfo?.accessToken).toBe(expectedAccessToken)
    expectCorrectEndpointWasHit(errorMockHttp, "https://www.example.com/api/v1/refresh_token")
})

test("client cannot use cached value if the API fails and the value has expired", async () => {
    const expiresAtSeconds = INITIAL_TIME_SECONDS + 60 * 30
    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken()
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    // First we get the token like normal
    const authenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo?.accessToken).toBe(expectedAccessToken)
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token")

    // One minute after expiration
    jest.setSystemTime((expiresAtSeconds + 60) * 1000)

    setupMockHttpThatReturnsUnknownError()
    await expect(async () => {
        await client.getAuthenticationInfoOrNull()
    }).rejects.not.toBeNull()
})

test("client returns null on a 401 after expiration", async () => {
    const expiresAtSeconds = INITIAL_TIME_SECONDS + 60 * 30
    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken(expiresAtSeconds)
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    // First we get the token like normal
    const authenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo?.accessToken).toBe(expectedAccessToken)
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token")

    // Then we force a refresh by moving time forward, and setup the server to 401
    jest.setSystemTime(expiresAtSeconds * 1000 + 10)
    const { mockHttp: errorMockHttp } = setupMockHttpThatReturnsUnauthorized()
    const errorAuthenticationInfo = await client.getAuthenticationInfoOrNull()
    expect(errorAuthenticationInfo).toBeNull()
    expectCorrectEndpointWasHit(errorMockHttp, "https://www.example.com/api/v1/refresh_token")
})

test("getAuthenticationInfoOrNull after logout triggers another http call", async () => {
    const expiresAtSeconds = INITIAL_TIME_SECONDS + 60 * 30
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    // First get the token and make sure it hit the server
    const { expectedAccessToken: expectedAccessToken0, mockHttp: mockHttp0 } =
        setupMockHttpThatReturnsAccessToken(expiresAtSeconds)
    const authenticationInfo0 = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo0?.accessToken).toBe(expectedAccessToken0)
    expectCorrectEndpointWasHit(mockHttp0, "https://www.example.com/api/v1/refresh_token", 1)

    // Then logout and make sure it hit the server
    const { mockHttp: logoutMockHttp } = setupMockHttpForLogout()
    await client.logout(false)
    expectCorrectEndpointWasHit(logoutMockHttp, "https://www.example.com/api/v1/logout", 1, "post")

    // Then make sure the next call to getAuthenticationInfoOrNull hits the server
    const { expectedAccessToken: expectedAccessToken1, mockHttp: mockHttp1 } =
        setupMockHttpThatReturnsAccessToken(expiresAtSeconds)
    const authenticationInfo1 = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo1?.accessToken).toBe(expectedAccessToken1)
    expectCorrectEndpointWasHit(mockHttp1, "https://www.example.com/api/v1/refresh_token", 1)
})

test("getAuthenticationInfoOrNull after logout triggers another http call, and returns null on 401", async () => {
    const expiresAtSeconds = INITIAL_TIME_SECONDS + 60 * 30
    let client = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    // First get the token and make sure it hit the server
    const { expectedAccessToken: expectedAccessToken0, mockHttp: mockHttp0 } =
        setupMockHttpThatReturnsAccessToken(expiresAtSeconds)
    const authenticationInfo0 = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo0?.accessToken).toBe(expectedAccessToken0)
    expectCorrectEndpointWasHit(mockHttp0, "https://www.example.com/api/v1/refresh_token", 1)

    // Then logout and make sure it hit the server
    const { mockHttp: logoutMockHttp } = setupMockHttpForLogout()
    await client.logout(false)
    expectCorrectEndpointWasHit(logoutMockHttp, "https://www.example.com/api/v1/logout", 1, "post")

    // Then make sure the next call to get hits the server
    const { mockHttp: mockHttp1 } = setupMockHttpThatReturnsUnauthorized()
    const authenticationInfo1 = await client.getAuthenticationInfoOrNull()
    expect(authenticationInfo1).toBeNull()
    expectCorrectEndpointWasHit(mockHttp1, "https://www.example.com/api/v1/refresh_token", 1)
})

test("multiple clients will both be logged in one logs in", async () => {
    let client0 = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })
    let client1 = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken()
    const authenticationInfo0 = await client0.getAuthenticationInfoOrNull()
    expect(authenticationInfo0?.accessToken).toBe(expectedAccessToken)
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token", 2)

    // Then we set up the server to return 401s because client1 should already be logged in
    setupMockHttpThatReturnsUnauthorized()

    const authenticationInfo1 = await client1.getAuthenticationInfoOrNull()
    expect(authenticationInfo1?.accessToken).toBe(expectedAccessToken)
})

test("observers work", async () => {
    let client0 = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })
    let client1 = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    let client0Observed: boolean[] = []
    let client1Observed: boolean[] = []
    const client0Observer = (loggedIn: boolean) => {
        client0Observed.push(loggedIn)
    }
    const client1Observer = (loggedIn: boolean) => {
        client1Observed.push(loggedIn)
    }
    client0.addLoggedInChangeObserver(client0Observer)
    client1.addLoggedInChangeObserver(client1Observer)

    // When one logs in the other should as well
    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken()
    const authenticationInfo0 = await client0.getAuthenticationInfoOrNull()
    expect(authenticationInfo0?.accessToken).toBe(expectedAccessToken)
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token", 2)

    // Then have 0 logout which should have 1 logout as well
    setupMockHttpForLogout()
    await client0.logout(false)

    // Removing the 1st observer means it's observed array should no longer be updated
    client1.removeLoggedInChangeObserver(client1Observer)
    setupMockHttpThatReturnsAccessToken()
    await client0.getAuthenticationInfoOrNull()

    expect(client0Observed).toStrictEqual([true, false, true])
    expect(client1Observed).toStrictEqual([true, false])
})

test("if a new client is created and cannot get an access token, it should trigger a logout event", async () => {
    let client0 = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    // First client is set up and gets a token
    const { expectedAccessToken, mockHttp } = setupMockHttpThatReturnsAccessToken()
    const authenticationInfo0 = await client0.getAuthenticationInfoOrNull()
    expect(authenticationInfo0?.accessToken).toBe(expectedAccessToken)
    expectCorrectEndpointWasHit(mockHttp, "https://www.example.com/api/v1/refresh_token", 1)

    // The user is no longer logged in
    const { mockHttp: logoutMockHttp } = setupMockHttpThatReturnsUnauthorized()

    // Since client0 already got a token and time isn't advancing, that token is still valid
    const cachedAuthenticationInfo0 = await client0.getAuthenticationInfoOrNull()
    expect(cachedAuthenticationInfo0?.accessToken).toBe(expectedAccessToken)

    // Even though this new client was never logged in, it should trigger a logout event for client0
    let client1 = createClient({ authUrl: "https://www.example.com", enableBackgroundTokenRefresh: false })

    const post401AuthenticationInfo1 = await client1.getAuthenticationInfoOrNull()
    expect(post401AuthenticationInfo1).toBeNull()
    const post401AuthenticationInfo0 = await client0.getAuthenticationInfoOrNull()
    expect(post401AuthenticationInfo0).toBeNull()

    // Called 3 times because client0 ends up making 2 requests, 1 when client1 triggers a logout event and 1 when asked
    expectCorrectEndpointWasHit(logoutMockHttp, "https://www.example.com/api/v1/refresh_token", 3)
})

function expectCorrectEndpointWasHit(mockHttp: any, correctRefreshUrl: string, numSendTimes = 1, method = "get") {
    expect(mockHttp.open).toHaveBeenCalledWith(method, correctRefreshUrl)
    expect(mockHttp.withCredentials).toBe(true)
    expect(mockHttp.send).toBeCalledTimes(numSendTimes)
}

function expectMockWasNeverCalled(mockHttp: any) {
    expect(mockHttp.open).not.toBeCalled()
    expect(mockHttp.send).not.toBeCalled()
}

function setupMockHttpForLogout() {
    const response = ok({})
    const mockHttp = setupMockXMLHttpRequest(response)
    return { mockHttp }
}

interface ApiUser {
    user_id: string
    email: string
    username?: string
}

export type ApiOrgMemberInfo = {
    org_id: string
    org_name: string
    url_safe_org_name: string
    user_role: string
}
export type ApiOrgIdToOrgMemberInfo = {
    [org_id: string]: ApiOrgMemberInfo
}

const DEFAULT_USER: ApiUser = {
    user_id: "9c2ea1ea-6a1a-40bf-9810-67d7644a0f69",
    email: "user@example.com",
    username: "username",
}

function setupMockHttpThatReturnsAccessToken(
    expiresAtSeconds: number = INITIAL_TIME_SECONDS + 60 * 30,
    user: ApiUser = DEFAULT_USER,
    org_id_to_org_member_info: ApiOrgIdToOrgMemberInfo | undefined = undefined
) {
    const expectedAccessToken = Math.random().toString(36).substr(2)
    const response = ok({
        access_token: expectedAccessToken,
        expires_at_seconds: expiresAtSeconds,
        org_id_to_org_member_info: org_id_to_org_member_info,
        user: user,
    })
    const mockHttp = setupMockXMLHttpRequest(response)
    return { expectedAccessToken, mockHttp }
}

function setupMockHttpThatReturnsUnauthorized() {
    const response: UnauthorizedResponse = { status: ResponseStatus.Unauthorized }
    const mockHttp = setupMockXMLHttpRequest(response)
    return { mockHttp }
}

function setupMockHttpThatReturnsUnknownError() {
    const response: UnknownErrorResponse = { status: ResponseStatus.UnknownError }
    const mockHttp = setupMockXMLHttpRequest(response)
    return { mockHttp }
}
