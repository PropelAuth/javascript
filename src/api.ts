import { OrgIdToOrgMemberInfo } from "./org"
import {getOrgHelper, OrgHelper} from "./org_helper";

export type User = {
    userId: string

    email: string
    emailConfirmed: boolean,

    username?: string
    firstName?: string,
    lastName?: string,
    pictureUrl?: string,

    locked: boolean,
    enabled: boolean,
    mfaEnabled: boolean,
}

export type AuthenticationInfo = {
    accessToken: string
    expiresAtSeconds: number
    orgHelper: OrgHelper,

    /**
     * You should prefer orgHelper to orgIdToOrgMemberInfo.
     * orgHelper provides useful abstractions over this mapping
     */
    orgIdToOrgMemberInfo?: OrgIdToOrgMemberInfo
    user: User
}

export type LogoutResponse = {
    redirect_to: string
}

export function fetchAuthenticationInfo(authUrl: string): Promise<AuthenticationInfo | null> {
    return new Promise((resolve, reject) => {
        const http = new XMLHttpRequest()

        http.onreadystatechange = function () {
            if (http.readyState === XMLHttpRequest.DONE) {
                const status = http.status

                if (status >= 200 && status < 300) {
                    try {
                        const refreshTokenAndUserInfo = parseJsonConvertingSnakeToCamel(http.responseText)
                        resolve(refreshTokenAndUserInfo)
                    } catch (e) {
                        console.error("Unable to process authentication response", e)
                        reject({
                            status: 500,
                            message: "Unable to process authentication response",
                        })
                    }
                } else if (status === 401) {
                    resolve(null)
                } else if (status === 0) {
                    logCorsError()
                    reject({
                        status: 503,
                        message: "Unable to process authentication response",
                    })
                } else {
                    reject({
                        status,
                        message: http.responseText,
                    })
                }
            }
        }

        http.open("get", `${authUrl}/api/v1/refresh_token`)
        http.withCredentials = true
        http.ontimeout = function () {
            reject({
                status: 408,
                message: "Request timed out",
            })
        }
        http.send(null)
    })
}

export function logout(authUrl: string): Promise<LogoutResponse> {
    return new Promise((resolve, reject) => {
        const http = new XMLHttpRequest()

        http.onreadystatechange = function () {
            if (http.readyState === XMLHttpRequest.DONE) {
                const status = http.status
                if (status >= 200 && status < 300) {
                    const jsonResponse = JSON.parse(http.responseText)
                    resolve(jsonResponse)
                } else if (status === 0) {
                    logCorsError()
                    reject({
                        status: 503,
                        message: "Unable to process authentication response",
                    })
                } else {
                    console.error("Logout error", http.status, http.responseText)
                    reject({
                        status,
                        message: http.responseText,
                    })
                }
            }
        }

        http.open("post", `${authUrl}/api/v1/logout`)
        http.withCredentials = true
        http.ontimeout = function () {
            reject({
                status: 408,
                message: "Request timed out",
            })
        }
        http.send(null)
    })
}

// The API responds with snake_case, but TypeScript convention is camelCase.
// When parsing JSON, we pass in reviver function to convert from snake_case to camelCase.
export function parseJsonConvertingSnakeToCamel(str: string): AuthenticationInfo {
    return JSON.parse(str, function (key, value) {
        if (key === "org_id") {
            this.orgId = value
        } else if (key === "org_name") {
            this.orgName = value
        } else if (key === "url_safe_org_name") {
            this.urlSafeOrgName = value
        } else if (key === "user_role") {
            this.userAssignedRole = value
        } else if (key === "user_roles") {
            this.userRoles = value
        } else if (key === "user_permissions") {
            this.userPermissions = value
        } else if (key === "access_token") {
            this.accessToken = value
        } else if (key === "expires_at_seconds") {
            this.expiresAtSeconds = value
        } else if (key === "org_id_to_org_member_info") {
            this.orgIdToOrgMemberInfo = value
            this.orgHelper = getOrgHelper(value)
        } else if (key === "user_id") {
            this.userId = value
        } else if (key === "email_confirmed") {
            this.emailConfirmed = value
        } else if (key === "first_name") {
            this.firstName = value
        } else if (key === "last_name") {
            this.lastName = value
        } else if (key === "picture_url") {
            this.pictureUrl = value
        } else if (key === "mfa_enabled") {
            this.mfaEnabled = value
        } else {
            return value
        }
    })
}

function logCorsError() {
    console.error(
        "Request to PropelAuth failed due to a CORS error. There are a few likely causes: \n" +
        " 1. In the Frontend Integration section of your dashboard, make sure your requests are coming either the specified Application URL or localhost with a matching port.\n" +
        " 2. Make sure your server is hosted on HTTPS in production."
    )
}