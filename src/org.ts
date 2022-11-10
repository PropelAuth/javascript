export type OrgMemberInfo = {
    orgId: string
    orgName: string
    urlSafeOrgName: string
    userAssignedRole: string
    userInheritedRolesPlusCurrentRole: string[]
    userPermissions: string[]
}
export type OrgIdToOrgMemberInfo = {
    [orgId: string]: OrgMemberInfo
}
