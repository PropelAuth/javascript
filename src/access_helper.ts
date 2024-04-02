import {OrgIdToOrgMemberInfo, OrgRoleStructure} from "./org";

export type AccessHelper = {
    isRole: (orgId: string, role: string) => boolean
    isAtLeastRole: (orgId: string, role: string) => boolean
    hasPermission: (orgId: string, permission: string) => boolean
    hasAllPermissions: (orgId: string, permissions: string[]) => boolean
    getAccessHelperWithOrgId: (orgId: string) => AccessHelperWithOrg
}

export type AccessHelperWithOrg = {
    isRole: (role: string) => boolean
    isAtLeastRole: (role: string) => boolean
    hasPermission: (permission: string) => boolean
    hasAllPermissions: (permissions: string[]) => boolean
}

export function getAccessHelper(
    orgIdToOrgMemberInfo: OrgIdToOrgMemberInfo,
): AccessHelper {
    function isRole(orgId: string, role: string): boolean {
        const orgMemberInfo = orgIdToOrgMemberInfo[orgId]
        if (orgMemberInfo === undefined) {
            return false;
        }
        if (orgMemberInfo.orgRoleStructure === OrgRoleStructure.MultiRole) {
            return orgMemberInfo.userAssignedRole === role || orgMemberInfo.userAssignedAdditionalRoles.includes(role)
        } else {
            return orgMemberInfo.userAssignedRole === role
        }
    }
    
    function isAtLeastRole(orgId: string, role: string): boolean {
        const orgMemberInfo = orgIdToOrgMemberInfo[orgId]
        if (orgMemberInfo === undefined) {
            return false;
        }
        if (orgMemberInfo.orgRoleStructure === OrgRoleStructure.MultiRole) {
            return orgMemberInfo.userAssignedRole === role || orgMemberInfo.userAssignedAdditionalRoles.includes(role)
        } else {
            return orgMemberInfo.userInheritedRolesPlusCurrentRole.includes(role)
        }
    }

    function hasPermission(orgId: string, permission: string): boolean {
        const orgMemberInfo = orgIdToOrgMemberInfo[orgId]
        if (orgMemberInfo === undefined) {
            return false;
        }
        return orgMemberInfo.userPermissions.includes(permission)
    }

    function hasAllPermissions(orgId: string, permissions: string[]): boolean {
        const orgMemberInfo = orgIdToOrgMemberInfo[orgId]
        if (orgMemberInfo === undefined) {
            return false;
        }
        return permissions.every(permission => orgMemberInfo.userPermissions.includes(permission))
    }

    function getAccessHelperWithOrgId(orgId: string): AccessHelperWithOrg {
        return {
            isRole(role: string): boolean {
                return isRole(orgId, role)
            },
            isAtLeastRole(role: string): boolean {
                return isAtLeastRole(orgId, role)
            },
            hasPermission(permission: string): boolean {
                return hasPermission(orgId, permission)
            },
            hasAllPermissions(permissions: string[]): boolean {
                return hasAllPermissions(orgId, permissions)
            },
        }
    }
    
    return {
        isRole,
        isAtLeastRole,
        hasPermission,
        hasAllPermissions,
        getAccessHelperWithOrgId,
    }
}
