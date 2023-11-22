/**
 * @jest-environment jsdom
 */
export enum ResponseStatus {
    Ok = 200,
    Unauthorized = 401,
    Timeout = 408,
    UnknownError = 500,
}

export type OkResponse = {
    status: ResponseStatus.Ok
    data: object
}

export type UnauthorizedResponse = {
    status: ResponseStatus.Unauthorized
}

export type TimeoutResponse = {
    status: ResponseStatus.Timeout
}

export type UnknownErrorResponse = {
    status: ResponseStatus.UnknownError
}

export type Response = OkResponse | UnauthorizedResponse | TimeoutResponse | UnknownErrorResponse

export function ok(data: object): OkResponse {
    return {
        status: ResponseStatus.Ok,
        data: data,
    }
}

export function setupMockFetch(response: Response) {
    const fetchResponse: any = {
        status: response.status,
        statusText: response.status,
        ok: false
    }
    if (response.status === 200) {
        fetchResponse["ok"] = true
        fetchResponse["text"] = () => Promise.resolve(JSON.stringify(response.data))
        fetchResponse["json"] = () => Promise.resolve(response.data)
    }
    const mockedFetch = jest.fn(() =>
        Promise.resolve(fetchResponse),
    )
    global.fetch = mockedFetch as jest.Mock;
    return mockedFetch
}

test("can mock requests", () => {
    const response = ok({ test: "response" })
    setupMockFetch(response)
    fetch("https://www.example.com/itwontreallyhitthis")
        .then(res => {
            expect(res.status).toBe(200)
            expect(res.ok).toBe(true)
            res.json().then(jsonRes => {
                expect(jsonRes).toMatchObject(response.data)
            })
            res.text().then(textRes => {
                expect(JSON.parse(textRes)).toMatchObject(response.data)
            })
        })
})

test("can mock failing responses", () => {
    const response: UnauthorizedResponse = {status: ResponseStatus.Unauthorized}
    setupMockFetch(response)
    fetch("https://www.example.com/itwontreallyhitthis")
        .then(res => {
            expect(res.status).toBe(401)
            expect(res.ok).toBe(false)
        })
})
