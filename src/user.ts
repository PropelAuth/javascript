export class User {
    public userId: string
    public orgIdToOrgMemberInfo?: OrgIdToOrgMemberInfo

    // Metadata about the user
    public email: string
    public firstName?: string
    public lastName?: string
    public username?: string
    public properties?: { [key: string]: unknown }

    // If you used our migration APIs to migrate this user from a different system,
    // this is their original ID from that system.
    public legacyUserId?: string
    public impersonatorUserId?: string

    constructor(
        userId: string,
        email: string,
        orgIdToOrgMemberInfo?: OrgIdToOrgMemberInfo,
        firstName?: string,
        lastName?: string,
        username?: string,
        legacyUserId?: string,
        impersonatorUserId?: string
    ) {
        this.userId = userId
        this.orgIdToOrgMemberInfo = orgIdToOrgMemberInfo

        this.email = email
        this.firstName = firstName
        this.lastName = lastName
        this.username = username

        this.legacyUserId = legacyUserId
        this.impersonatorUserId = impersonatorUserId
    }

    public getOrg(orgId: string): OrgMemberInfo | undefined {
        if (!this.orgIdToOrgMemberInfo) {
            return undefined
        }

        return this.orgIdToOrgMemberInfo[orgId]
    }

    public getOrgByName(orgName: string): OrgMemberInfo | undefined {
        if (!this.orgIdToOrgMemberInfo) {
            return undefined
        }

        const urlSafeOrgName = orgName.toLowerCase().replace(/ /g, "-")
        for (const orgId in this.orgIdToOrgMemberInfo) {
            const orgMemberInfo = this.orgIdToOrgMemberInfo[orgId]
            if (orgMemberInfo?.urlSafeOrgName === urlSafeOrgName) {
                return orgMemberInfo
            }
        }

        return undefined
    }

    public getProperty(key: string): unknown | undefined {
        if (!this.properties) {
            return undefined
        }

        return this.properties[key]
    }

    public getOrgs(): OrgMemberInfo[] {
        if (!this.orgIdToOrgMemberInfo) {
            return []
        }

        return Object.values(this.orgIdToOrgMemberInfo)
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
        const orgIdToOrgMemberInfo: OrgIdToOrgMemberInfo = {}
        for (const orgId in obj.orgIdToOrgMemberInfo) {
            orgIdToOrgMemberInfo[orgId] = OrgMemberInfo.fromJSON(JSON.stringify(obj.orgIdToOrgMemberInfo[orgId]))
        }
        try {
            return new User(
                obj.userId,
                obj.email,
                orgIdToOrgMemberInfo,
                obj.firstName,
                obj.lastName,
                obj.username,
                obj.legacyUserId,
                obj.impersonatorUserId
            )
        } catch (e) {
            console.error("Unable to parse User. Make sure the JSON string is a stringified `User` type.", e)
            throw e
        }
    }
}

interface OrgIdToOrgMemberInfo {
    [orgId: string]: OrgMemberInfo
}

export class OrgMemberInfo {
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

    // Getters for priavet fields
    get assignedRole(): string {
        return this.userAssignedRole
    }

    get inheritedRolesPlusCurrentRole(): string[] {
        return this.userInheritedRolesPlusCurrentRole
    }

    get permissions(): string[] {
        return this.userPermissions
    }

    public static fromJSON(json: string): OrgMemberInfo {
        const obj = JSON.parse(json)
        try {
            return new OrgMemberInfo(
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
                "Unable to parse OrgMemberInfo. Make sure the JSON string is a stringified `OrgMemberInfo` type.",
                e
            )
            throw e
        }
    }
}
