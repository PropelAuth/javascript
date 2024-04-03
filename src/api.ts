import { AccessHelper, getAccessHelper } from "./access_helper"
import { OrgIdToOrgMemberInfo } from "./org"
import { getOrgHelper, OrgHelper } from "./org_helper"
import { convertOrgIdToOrgMemberInfo, UserClass } from "./user"

export type User = {
    userId: string

    email: string
    emailConfirmed: boolean

    hasPassword: boolean

    username?: string
    firstName?: string
    lastName?: string
    pictureUrl?: string

    locked: boolean
    enabled: boolean
    mfaEnabled: boolean
    canCreateOrgs: boolean

    createdAt: number
    lastActiveAt: number

    legacyUserId?: string
    properties?: { [key: string]: unknown }
}

export type AuthenticationInfo = {
    accessToken: string
    expiresAtSeconds: number
    orgHelper: OrgHelper
    accessHelper: AccessHelper

    /**
     * You should prefer orgHelper to orgIdToOrgMemberInfo.
     * orgHelper provides useful abstractions over this mapping
     */
    orgIdToOrgMemberInfo?: OrgIdToOrgMemberInfo
    user: User
    userClass: UserClass

    // If someone on your team is impersonating another user, this will be set to the employee's ID
    // By default, user impersonation is turned off and this will be undefined
    impersonatorUserId?: string
}

export type LogoutResponse = {
    redirect_to: string
}

export function fetchAuthenticationInfo(authUrl: string): Promise<AuthenticationInfo | null> {
    return fetch(`${authUrl}/api/v1/refresh_token`, {
        method: "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    }).then((res) => {
        if (res.status === 401) {
            return null
        } else if (res.status === 0) {
            logCorsError()
            return Promise.reject({
                status: 503,
                message: "Unable to process authentication response",
            })
        } else if (!res.ok) {
            return Promise.reject({
                status: res.status,
                message: res.statusText,
            })
        } else {
            return parseResponse(res)
        }
    })
}

export function logout(authUrl: string): Promise<LogoutResponse> {
    return fetch(`${authUrl}/api/v1/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    }).then((res) => {
        if (res.status === 0) {
            logCorsError()
            return Promise.reject({
                status: 503,
                message: "Unable to process authentication response",
            })
        } else if (!res.ok) {
            console.error("Logout error", res.status, res.statusText)
            return Promise.reject({
                status: res.status,
                message: res.statusText,
            })
        } else {
            return res.json()
        }
    })
}

function parseResponse(res: Response): Promise<AuthenticationInfo> {
    return res.text().then(
        (httpResponse) => {
            try {
                const authInfoWithoutUserClass = parseJsonConvertingSnakeToCamel(httpResponse)
                return withExtraArgs(authInfoWithoutUserClass)
            } catch (e) {
                console.error("Unable to process authentication response", e)
                return Promise.reject({
                    status: 500,
                    message: "Unable to process authentication response",
                })
            }
        },
        (e) => {
            console.error("Unable to process authentication response", e)
            return Promise.reject({
                status: 500,
                message: "Unable to process authentication response",
            })
        }
    )
}

// The API responds with snake_case, but TypeScript convention is camelCase.
// When parsing JSON, we pass in reviver function to convert from snake_case to camelCase.
export function parseJsonConvertingSnakeToCamel(str: string): AuthenticationInfo {
    return JSON.parse(str, function (key, value) {
        if (key === "org_id") {
            this.orgId = value
        } else if (key === "org_name") {
            this.orgName = value
        } else if (key === "org_metadata") {
            this.orgMetadata = value
        } else if (key === "url_safe_org_name") {
            this.urlSafeOrgName = value
        } else if (key === "user_role") {
            this.userAssignedRole = value
        } else if (key === "inherited_user_roles_plus_current_role") {
            this.userInheritedRolesPlusCurrentRole = value
        } else if (key === "user_permissions") {
            this.userPermissions = value
        } else if (key === "access_token") {
            this.accessToken = value
        } else if (key === "expires_at_seconds") {
            this.expiresAtSeconds = value
        } else if (key === "org_id_to_org_member_info") {
            this.orgIdToOrgMemberInfo = value
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
        } else if (key === "has_password") {
            this.hasPassword = value
        } else if (key === "can_create_orgs") {
            this.canCreateOrgs = value
        } else if (key === "created_at") {
            this.createdAt = value
        } else if (key === "last_active_at") {
            this.lastActiveAt = value
        } else if (key === "legacy_user_id") {
            this.legacyUserId = value
        } else if (key === "impersonator_user") {
            this.impersonatorUserId = value
        } else if (key === "org_role_structure") {
            this.orgRoleStructure = value
        } else if (key === "additional_roles") {
            this.userAssignedAdditionalRoles = value
        } else {
            return value
        }
    })
}

function withExtraArgs(authInfoWithoutExtraArgs: AuthenticationInfo): Promise<AuthenticationInfo> {
    if (authInfoWithoutExtraArgs.orgIdToOrgMemberInfo) {
        authInfoWithoutExtraArgs.orgHelper = getOrgHelper(authInfoWithoutExtraArgs.orgIdToOrgMemberInfo)
        authInfoWithoutExtraArgs.accessHelper = getAccessHelper(authInfoWithoutExtraArgs.orgIdToOrgMemberInfo)
    }
    authInfoWithoutExtraArgs.userClass = new UserClass(
        {
            userId: authInfoWithoutExtraArgs.user.userId,
            email: authInfoWithoutExtraArgs.user.email,
            createdAt: authInfoWithoutExtraArgs.user.createdAt,
            firstName: authInfoWithoutExtraArgs.user.firstName,
            lastName: authInfoWithoutExtraArgs.user.lastName,
            username: authInfoWithoutExtraArgs.user.username,
            properties: authInfoWithoutExtraArgs.user.properties,
            pictureUrl: authInfoWithoutExtraArgs.user.pictureUrl,
            hasPassword: authInfoWithoutExtraArgs.user.hasPassword,
            hasMfaEnabled: authInfoWithoutExtraArgs.user.mfaEnabled,
            canCreateOrgs: authInfoWithoutExtraArgs.user.canCreateOrgs,
            legacyUserId: authInfoWithoutExtraArgs.user.legacyUserId,
            impersonatorUserId: authInfoWithoutExtraArgs.impersonatorUserId,
        },
        convertOrgIdToOrgMemberInfo(authInfoWithoutExtraArgs.orgIdToOrgMemberInfo)
    )
    return Promise.resolve(authInfoWithoutExtraArgs)
}

function logCorsError() {
    console.error(
        "Request to PropelAuth failed due to a CORS error. There are a few likely causes: \n" +
            " 1. In the Frontend Integration section of your dashboard, make sure your requests are coming either the specified Application URL or localhost with a matching port.\n" +
            " 2. Make sure your server is hosted on HTTPS in production."
    )
}
