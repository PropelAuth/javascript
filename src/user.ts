import { OrgIdToOrgMemberInfo } from "./org"
import { LoginMethod } from "./login_method"

export type UserProperties = { [key: string]: unknown }

export interface UserFields {
    userId: string
    email: string
    createdAt: number
    firstName?: string
    lastName?: string
    username?: string
    properties?: UserProperties
    pictureUrl?: string
    hasPassword?: boolean
    hasMfaEnabled?: boolean
    canCreateOrgs?: boolean
    legacyUserId?: string
    impersonatorUserId?: string
    loginMethod?: LoginMethod
}

export class UserClass {
    public userId: string
    public orgIdToUserOrgInfo?: OrgIdToOrgMemberInfoClass

    // Metadata about the user
    public email: string
    public createdAt: number
    public firstName?: string
    public lastName?: string
    public username?: string
    public properties?: UserProperties
    public pictureUrl?: string
    public hasPassword?: boolean
    public hasMfaEnabled?: boolean
    public canCreateOrgs?: boolean
    public loginMethod?: LoginMethod

    // If you used our migration APIs to migrate this user from a different system,
    // this is their original ID from that system.
    public legacyUserId?: string
    public impersonatorUserId?: string

    constructor(userFields: UserFields, orgIdToUserOrgInfo?: OrgIdToOrgMemberInfoClass) {
        this.userId = userFields.userId
        this.orgIdToUserOrgInfo = orgIdToUserOrgInfo

        this.email = userFields.email
        this.firstName = userFields.firstName
        this.lastName = userFields.lastName
        this.username = userFields.username
        this.createdAt = userFields.createdAt
        this.pictureUrl = userFields.pictureUrl
        this.hasPassword = userFields.hasPassword
        this.hasMfaEnabled = userFields.hasMfaEnabled
        this.canCreateOrgs = userFields.canCreateOrgs

        this.legacyUserId = userFields.legacyUserId
        this.impersonatorUserId = userFields.impersonatorUserId
        this.properties = userFields.properties
        this.loginMethod = userFields.loginMethod
    }

    public getOrg(orgId: string): OrgMemberInfoClass | undefined {
        if (!this.orgIdToUserOrgInfo) {
            return undefined
        }

        return this.orgIdToUserOrgInfo[orgId]
    }

    public getOrgByName(orgName: string): OrgMemberInfoClass | undefined {
        if (!this.orgIdToUserOrgInfo) {
            return undefined
        }

        const urlSafeOrgName = orgName.toLowerCase().replace(/ /g, "-")
        for (const orgId in this.orgIdToUserOrgInfo) {
            const orgMemberInfo = this.orgIdToUserOrgInfo[orgId]
            if (orgMemberInfo?.urlSafeOrgName === urlSafeOrgName) {
                return orgMemberInfo
            }
        }

        return undefined
    }

    public getUserProperty(key: string): unknown | undefined {
        if (!this.properties) {
            return undefined
        }

        return this.properties[key]
    }

    public getOrgs(): OrgMemberInfoClass[] {
        if (!this.orgIdToUserOrgInfo) {
            return []
        }

        return Object.values(this.orgIdToUserOrgInfo)
    }

    public isImpersonating(): boolean {
        return !!this.impersonatorUserId
    }

    public isRole(orgId: string, role: string): boolean {
        const orgMemberInfo = this.getOrg(orgId)
        if (!orgMemberInfo) {
            return false
        }

        return orgMemberInfo.isRole(role)
    }

    public isAtLeastRole(orgId: string, role: string): boolean {
        const orgMemberInfo = this.getOrg(orgId)
        if (!orgMemberInfo) {
            return false
        }

        return orgMemberInfo.isAtLeastRole(role)
    }

    public hasPermission(orgId: string, permission: string): boolean {
        const orgMemberInfo = this.getOrg(orgId)
        if (!orgMemberInfo) {
            return false
        }

        return orgMemberInfo.hasPermission(permission)
    }

    public hasAllPermissions(orgId: string, permissions: string[]): boolean {
        const orgMemberInfo = this.getOrg(orgId)
        if (!orgMemberInfo) {
            return false
        }

        return orgMemberInfo.hasAllPermissions(permissions)
    }

    public static fromJSON(json: string): UserClass {
        const obj = JSON.parse(json)
        const orgIdToUserOrgInfo: OrgIdToOrgMemberInfoClass = {}
        for (const orgId in obj.orgIdToUserOrgInfo) {
            orgIdToUserOrgInfo[orgId] = OrgMemberInfoClass.fromJSON(JSON.stringify(obj.orgIdToUserOrgInfo[orgId]))
        }
        try {
            return new UserClass(
                {
                    userId: obj.userId,
                    email: obj.email,
                    createdAt: obj.createdAt,
                    firstName: obj.firstName,
                    lastName: obj.lastName,
                    username: obj.username,
                    legacyUserId: obj.legacyUserId,
                    impersonatorUserId: obj.impersonatorUserId,
                    properties: obj.properties,
                    pictureUrl: obj.pictureUrl,
                    hasPassword: obj.hasPassword,
                    hasMfaEnabled: obj.hasMfaEnabled,
                    canCreateOrgs: obj.canCreateOrgs,
                    loginMethod: obj.loginMethod,
                },
                orgIdToUserOrgInfo
            )
        } catch (e) {
            console.error("Unable to parse User. Make sure the JSON string is a stringified `UserClass` type.", e)
            throw e
        }
    }
}

export interface OrgIdToOrgMemberInfoClass {
    [orgId: string]: OrgMemberInfoClass
}

export class OrgMemberInfoClass {
    public orgId: string
    public orgName: string
    public orgMetadata: { [key: string]: any }
    public urlSafeOrgName: string

    public userAssignedRole: string
    public userInheritedRolesPlusCurrentRole: string[]
    public userPermissions: string[]

    constructor(
        orgId: string,
        orgName: string,
        orgMetadata: { [key: string]: any },
        urlSafeOrgName: string,
        userAssignedRole: string,
        userInheritedRolesPlusCurrentRole: string[],
        userPermissions: string[]
    ) {
        this.orgId = orgId
        this.orgName = orgName
        this.orgMetadata = orgMetadata
        this.urlSafeOrgName = urlSafeOrgName

        this.userAssignedRole = userAssignedRole
        this.userInheritedRolesPlusCurrentRole = userInheritedRolesPlusCurrentRole
        this.userPermissions = userPermissions
    }

    // validation methods
    public isRole(role: string): boolean {
        return this.userAssignedRole === role
    }

    public isAtLeastRole(role: string): boolean {
        return this.userInheritedRolesPlusCurrentRole.includes(role)
    }

    public hasPermission(permission: string): boolean {
        return this.userPermissions.includes(permission)
    }

    public hasAllPermissions(permissions: string[]): boolean {
        return permissions.every((permission) => this.hasPermission(permission))
    }

    public static fromJSON(json: string): OrgMemberInfoClass {
        const obj = JSON.parse(json)
        try {
            return new OrgMemberInfoClass(
                obj.orgId,
                obj.orgName,
                obj.orgMetadata,
                obj.urlSafeOrgName,
                obj.userAssignedRole,
                obj.userInheritedRolesPlusCurrentRole,
                obj.userPermissions
            )
        } catch (e) {
            console.error(
                "Unable to parse UserOrgInfo. Make sure the JSON string is a stringified `UserOrgInfo` type.",
                e
            )
            throw e
        }
    }
}

export function convertOrgIdToOrgMemberInfo(
    orgIdToOrgMemberInfo: OrgIdToOrgMemberInfo | undefined
): OrgIdToOrgMemberInfoClass | undefined {
    if (orgIdToOrgMemberInfo === undefined) {
        return undefined
    }
    const orgIdToUserOrgInfo: OrgIdToOrgMemberInfoClass = {}
    for (const orgMemberInfo of Object.values(orgIdToOrgMemberInfo)) {
        orgIdToUserOrgInfo[orgMemberInfo.orgId] = new OrgMemberInfoClass(
            orgMemberInfo.orgId,
            orgMemberInfo.orgName,
            orgMemberInfo.orgMetadata,
            orgMemberInfo.urlSafeOrgName,
            orgMemberInfo.userAssignedRole,
            orgMemberInfo.userInheritedRolesPlusCurrentRole,
            orgMemberInfo.userPermissions
        )
    }
    return orgIdToUserOrgInfo
}

