import {OrgIdToOrgMemberInfo} from "./org";

export type AccessHelper = {
    isRole: (orgId: string, role: string) => boolean
    isAtLeastRole: (orgId: string, role: string) => boolean
    hasPermission: (orgId: string, permission: string) => boolean
    hasAllPermissions: (orgId: string, permissions: string[]) => boolean
}

export function getAccessHelper(
    orgIdToOrgMemberInfo: OrgIdToOrgMemberInfo,
): AccessHelper {
    return {
        isRole(orgId: string, role: string): boolean {
            const orgMemberInfo = orgIdToOrgMemberInfo[orgId]
            if (orgMemberInfo === undefined) {
                return false;
            }
            return orgMemberInfo.userAssignedRole === role
        },
        isAtLeastRole(orgId: string, role: string): boolean {
            const orgMemberInfo = orgIdToOrgMemberInfo[orgId]
            if (orgMemberInfo === undefined) {
                return false;
            }
            return orgMemberInfo.userInheritedRolesPlusCurrentRole.includes(role)
        },
        hasPermission(orgId: string, permission: string): boolean {
            const orgMemberInfo = orgIdToOrgMemberInfo[orgId]
            if (orgMemberInfo === undefined) {
                return false;
            }
            return orgMemberInfo.userPermissions.includes(permission)
        },
        hasAllPermissions(orgId: string, permissions: string[]): boolean {
            const orgMemberInfo = orgIdToOrgMemberInfo[orgId]
            if (orgMemberInfo === undefined) {
                return false;
            }
            return permissions.every(permission => orgMemberInfo.userPermissions.includes(permission))
        },
        
    }
}
