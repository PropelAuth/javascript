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

export function setupMockXMLHttpRequest(response: Response) {
    let responseText
    if (response.status === ResponseStatus.Ok) {
        responseText = JSON.stringify(response.data)
    } else {
        responseText = "Error"
    }

    const mockXMLHttpRequest = {
        open: jest.fn(),
        onreadystatechange: jest.fn(() => {
            throw Error("onreadystatechage was not overridden")
        }),
        withCredentials: false,
        send: jest.fn(() => {
            mockXMLHttpRequest.onreadystatechange()
        }),
        readyState: 4,
        status: response.status,
        responseText: responseText,
    }

    // @ts-ignore
    window.XMLHttpRequest = jest.fn(() => mockXMLHttpRequest)

    // @ts-ignore
    window.XMLHttpRequest.DONE = 4

    return mockXMLHttpRequest
}

test("can mock requests", () => {
    const response = ok({ test: "response" })
    setupMockXMLHttpRequest(response)
    const http = new XMLHttpRequest()

    http.onreadystatechange = function () {
        expect(http.readyState).toBe(XMLHttpRequest.DONE)
        expect(http.status).toBe(200)
        const parsedResponse = JSON.parse(http.responseText)
        expect(parsedResponse).toMatchObject(response.data)
    }

    http.open("get", "https://www.example.com/itwontreallyhitthis")
    http.send(null)
})

test("fails if onreadystatechange is not modified", () => {
    const response = ok({ test: "response" })
    setupMockXMLHttpRequest(response)
    const http = new XMLHttpRequest()
    http.open("get", "https://www.example.com/itwontreallyhitthis")
    expect(() => {
        http.send(null)
    }).toThrow()
})
