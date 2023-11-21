type UserProperties = { [key: string]: unknown }

export class User {
    public userId: string
    public orgIdToUserOrgInfo?: OrgIdToUserOrgInfo

    // Metadata about the user
    public email: string
    public firstName?: string
    public lastName?: string
    public username?: string
    public properties?: UserProperties

    // If you used our migration APIs to migrate this user from a different system,
    // this is their original ID from that system.
    public legacyUserId?: string
    public impersonatorUserId?: string

    constructor(
        userId: string,
        email: string,
        orgIdToUserOrgInfo?: OrgIdToUserOrgInfo,
        firstName?: string,
        lastName?: string,
        username?: string,
        legacyUserId?: string,
        impersonatorUserId?: string,
        properties?: UserProperties
    ) {
        this.userId = userId
        this.orgIdToUserOrgInfo = orgIdToUserOrgInfo

        this.email = email
        this.firstName = firstName
        this.lastName = lastName
        this.username = username

        this.legacyUserId = legacyUserId
        this.impersonatorUserId = impersonatorUserId
        this.properties = properties
    }

    public getOrg(orgId: string): UserOrgInfo | undefined {
        if (!this.orgIdToUserOrgInfo) {
            return undefined
        }

        return this.orgIdToUserOrgInfo[orgId]
    }

    public getOrgByName(orgName: string): UserOrgInfo | undefined {
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

    public getOrgs(): UserOrgInfo[] {
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

    public static fromJSON(json: string): User {
        const obj = JSON.parse(json)
        const orgIdToUserOrgInfo: OrgIdToUserOrgInfo = {}
        for (const orgId in obj.orgIdToUserOrgInfo) {
            orgIdToUserOrgInfo[orgId] = UserOrgInfo.fromJSON(JSON.stringify(obj.orgIdToUserOrgInfo[orgId]))
        }
        try {
            return new User(
                obj.userId,
                obj.email,
                orgIdToUserOrgInfo,
                obj.firstName,
                obj.lastName,
                obj.username,
                obj.legacyUserId,
                obj.impersonatorUserId,
                obj.properties
            )
        } catch (e) {
            console.error("Unable to parse User. Make sure the JSON string is a stringified `User` type.", e)
            throw e
        }
    }
}

interface OrgIdToUserOrgInfo {
    [orgId: string]: UserOrgInfo
}

export class UserOrgInfo {
    public orgId: string
    public orgName: string
    public orgMetadata: { [key: string]: any }
    public urlSafeOrgName: string

    private userAssignedRole: string
    private userInheritedRolesPlusCurrentRole: string[]
    private userPermissions: string[]

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

    // Getters for private fields
    public getAssignedRole(): string {
        return this.userAssignedRole
    }

    public getInheritedRolesPlusCurrentRole(): string[] {
        return this.userInheritedRolesPlusCurrentRole
    }

    public getPermissions(): string[] {
        return this.userPermissions
    }

    public static fromJSON(json: string): UserOrgInfo {
        const obj = JSON.parse(json)
        try {
            return new UserOrgInfo(
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
