export type OrgMemberInfo = {
    orgId: string
    orgName: string
    urlSafeOrgName: string
    userAssignedRole: string
    userRoles: string[]
    userPermissions: string[]
}
export type OrgIdToOrgMemberInfo = {
    [orgId: string]: OrgMemberInfo
}
